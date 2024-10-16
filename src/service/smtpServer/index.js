import { SMTPServer } from "smtp-server";
import openpgpMailDecrypt from '../../controller/wksController/lib/mailparser-openpgp.js';
import { openpgpEncrypt } from 'nodemailer-openpgp';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createWkdHash, saveValidationData, getValidKey } from './utils.js';
import dotenv from 'dotenv';
import { sequelize } from '../../model/index.js';
import process from 'process';

dotenv.config();

const domains = await sequelize.models.Wkd.findAll();
const allowedDomains = new Set(domains.map(domain => domain.name));

const transporter = (process.env.MAIL ==  'sendmail') ? nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
}) : nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_AUTH,
        pass: process.env.SMTP_PASSWORD
    }
});

const server = new SMTPServer({
    starttls: true,
    logger: true,
    authOptional: true,
    key: (await sequelize.models.Wks.findAll({attributes: ['value'], where: {parameter: 'ServerDefaultKey'}}))[0]?.value,
    cert: (await sequelize.models.Wks.findAll({attributes: ['value'], where: {parameter: 'ServerDefaultCert'}}))[0]?.value,

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
                const submissionAddress = (await sequelize.models.Wks.findAll({
                    attributes: ['value'],
                    where: {parameter: 'submissionAddress'}})
                )[0]?.value;
                if (recipient.address !== submissionAddress) {
                    console.log('Wrong recipient');
                    let err = new Error("Recipient not found.");
                    err.responseCode = 500;
                    return callback(err);
                }
            }

            const opt = {
                privateKeyArmored: (await sequelize.models.Wks.findAll({attributes: ['value'], where: {parameter: 'pgpprivkey'}}))[0]?.value,
                passphrase: (await sequelize.models.Wks.findAll({attributes: ['value'], where: {parameter: 'pgpkeypass'}}))[0]?.value
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
                
                const defaultDomain= (await sequelize.models.Wks.findAll({
                    attributes: ['value'],
                    where: {parameter: 'defaultDomain'}})
                )[0]?.value;
                const mailOptions = {
                    to: smtpFrom,
                    subject: 'Validation Required for Your OpenPGP Key',
                    from: (await sequelize.models.Wks.findAll({where: {parameter: 'submissionAddress'}}))[0]?.value,
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
            });
        });
    }
});

server.on('error', (err) => {
    console.log("Error %s", err.message);
});

export default server;