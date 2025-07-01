import config from '../../config.js';
import { SMTPServer } from "smtp-server";
import openpgpMailDecrypt from '../../controller/wksController/lib/mailparser-openpgp.js';
import { openpgpEncrypt } from 'nodemailer-openpgp';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createWkdHash, saveValidationData, getValidKey } from './utils.js';
import { sequelize } from '../../model/index.js';

const domains = config.domains;
const allowedDomains = new Set(Object.keys(domains));

const transporter = (config.mail ==  'sendmail') ? nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
}) : nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: false,
    auth: {
        user: config.smtp_authuser,
        pass: config.smtp_authpass
    }
});

const server = new SMTPServer({
    starttls: true,
    logger: true,
    authOptional: true,
    key:  Object.keys(domains)[0].DomainKey,
    cert: Object.keys(domains)[0].DomainCert,

    async onData(stream, session, callback) {
        let emailData = '';

        stream.on('data', (chunk) => {
            emailData += chunk;
        });

        stream.on('end', async () => {
            console.log('Stream end');
            const smtpFrom = session.envelope.mailFrom.address;
            const fromDomain = session.envelope.mailFrom.address.split('@').pop();

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(smtpFrom) || !emailRegex.test(`test@${fromDomain}`)) {
                let err = new Error('Invalid email address format.');
                err.responseCode = 500;
                return callback(err);
            }

            if (!validateDomain(fromDomain, callback)) return;
            if (!validateRecipients(session.envelope.rcptTo, callback)) return;

            const opt = {
                privateKeyArmored: config.domains[0].pgpprivkey,
                passphrase: config.domains[0].pgpkeypass
            };

            try {
                const parsed = await openpgpMailDecrypt(emailData, opt);
                console.log('Message parsed');

                const publicKeyArmored = await getValidKey(parsed, smtpFrom);
                if (publicKeyArmored instanceof Error) {
                    publicKeyArmored.responseCode = 500;
                    return callback(publicKeyArmored);
                }

                const [smtpFromLocalpart, smtpFromDomain] = smtpFrom.split('@');
                const wdkHash = createWkdHash(smtpFromLocalpart);
                const token = crypto.randomBytes(32).toString('base64');

                saveValidationData(smtpFromDomain, wdkHash, publicKeyArmored, callback);
                
                const defaultDomain= Object.keys(config.domains)[0];
                const mailOptions = {
                    to: smtpFrom,
                    subject: 'Validation Required for Your OpenPGP Key',
                    from: config.smtp_mailaddress,
                    text: `Hello,\n\nPlease validate your OpenPGP key by clicking the following link:\n\nhttps://${defaultDomain}/api/${token}\n\nThank you.`,
                    html: `<p>Hello,</p><p>Please validate your OpenPGP key by clicking the following link:</p><a href="https://${defaultDomain}/api/${token}">Validate Key</a><p>Thank you.</p>`,
                };

                transporter.use('stream', openpgpEncrypt(opt));
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
            } catch (err) {
                console.log(err);
                let error = new Error('Could not parse the mail');
                error.responseCode = 500;
                return callback(error);
            }
        });
    }
});

function validateDomain(fromDomain, callback) {
    if (allowedDomains.size > 0 && !allowedDomains.has(fromDomain)) {
        console.log('Domain is not allowed');
        let err = new Error(`Your domain ${fromDomain} is not allowed to send mails to this server`);
        err.responseCode = 500;
        callback(err);
        return false;
    }
    console.log(`Domain is allowed: ${fromDomain}`);
    return true;
}

function validateRecipients(recipients, callback) {
    console.log('Recipients: ' + recipients);
    for (const recipient of recipients) {
        const submissionAddress = config.smtp_mailaddress;
        if (recipient.address !== submissionAddress) {
            console.log('Wrong recipient');
            let err = new Error("Recipient not found.");
            err.responseCode = 500;
            callback(err);
            return false;
        }
    }
    return true;
}

server.on('error', (err) => {
    console.log("Error %s", err.message);
});

export default server;