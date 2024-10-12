import fs from 'node:fs';
import { SMTPServer } from "smtp-server";
import ConfigLoader from './configLoader.js';
import openpgpMailDecrypt from '../controller/wksController/lib/mailparser-openpgp.js';
import { openpgpEncrypt } from 'nodemailer-openpgp';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createWkdHash, saveValidationData, getValidKey } from '../utils.js'; // Assuming these functions are moved to a utils file

const config = ConfigLoader.loadConfig();
const allowedDomains = new Set(Object.keys(config.domains));

const transporter = config.smtp.sendmail ? nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
}) : nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: {
        user: config.smtp.auth,
        pass: config.smtp.pass
    }
});

const server = new SMTPServer({
    starttls: true,
    logger: true,
    authOptional: true,
    key: fs.readFileSync(config.ServerDefaultKey),
    cert: fs.readFileSync(config.ServerDefaultCert),

    async onData(stream, session, callback) {
        let emailData = '';

        stream.on('data', (chunk) => {
            emailData += chunk;
        });

        stream.on('end', async () => {
            console.log('Stream end');
            const smtpFrom = session.envelope.mailFrom.address;
            const fromDomain = session.envelope.mailFrom.address.split('@').pop();

            console.log('Reading data');
            console.log(`SMTP From: ${smtpFrom}`);

            if (allowedDomains.size > 0 && !allowedDomains.has(fromDomain)) {
                console.log('Domain is not allowed');
                let err = new Error(`Your domain ${fromDomain} is not allowed to send mails to this server`);
                err.responseCode = 500;
                return callback(err);
            }
            console.log(`Domain is allowed: ${fromDomain}`);

            console.log('Recipients: ' + session.envelope.rcptTo);
            for (const recipient of session.envelope.rcptTo) {
                if (recipient.address !== config.smtp.mailaddress) {
                    console.log('Wrong recipient');
                    let err = new Error("Recipient not found.");
                    err.responseCode = 500;
                    return callback(err);
                }
            }

            const opt = {
                privateKeyArmored: fs.readFileSync(config.pgpprivkey).toString(),
                passphrase: config.pgpkeypass
            };

            openpgpMailDecrypt(emailData, opt, async (err, parsed) => {
                if (err) {
                    console.log(err);
                    let error = new Error('Could not parse the mail');
                    error.responseCode = 500;
                    return callback(error);
                }
                console.log('Message parsed');

                const publicKeyArmored = await getValidKey(parsed, smtpFrom);
                if (publicKeyArmored instanceof Error) {
                    publicKeyArmored.responseCode = 500;
                    return callback(publicKeyArmored);
                }

                const [smtpFromLocalpart, smtpFromDomain] = smtpFrom.split('@');
                const wdkHash = createWkdHash(smtpFromLocalpart);
                const token = crypto.randomBytes(16).toString('hex');

                saveValidationData(smtpFromDomain, wdkHash, publicKeyArmored, callback);

                const privateKeyArmored = fs.readFileSync(config.pgpprivkey, 'utf8');
                const passphrase = config.pgpkeypass;

                const mailOptions = {
                    from: config.smtp.mailaddress,
                    to: smtpFrom,
                    subject: 'Validation Required for Your OpenPGP Key',
                    text: `Hello,\n\nPlease validate your OpenPGP key by clicking the following link:\n\nhttps://${config.wksDomain}/api/${token}\n\nThank you.`,
                    html: `<p>Hello,</p><p>Please validate your OpenPGP key by clicking the following link:</p><a href="https://${config.wksDomain}/api/${token}">Validate Key</a><p>Thank you.</p>`,
                };

                transporter.use('stream', openpgpEncrypt({ signingKey: privateKeyArmored, passphrase: passphrase }));
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Error sending email:', error);
                        let err = new Error('Failed to send validation email.');
                        err.responseCode = 500;
                        return callback(err);
                    }
                    console.log('Validation email sent:', info.response);
                    return callback(null, "Message processed and validation email sent.");
                });
            });
        });
    }
});

server.on('error', (err) => {
    console.log("Error %s", err.message);
});

export default server;