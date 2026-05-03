
import nodemailer from 'nodemailer';
import config from '../config.js';
import { logger } from './logger.js';
import fs from 'fs';
import { openpgpEncrypt } from 'nodemailer-openpgp';

const transporter = (config.mail === 'sendmail') ? nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
}) : nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_tls || false,
    auth: {
        user: config.smtp_authuser,
        pass: config.smtp_authpass
    }
});

/**
 * Sends a validation email with a link to activate the PGP key.
 */
export async function sendValidationEmail(email, token) {
    const defaultDomain = config.domains[0];
    const validationLink = `https://${defaultDomain}/api/${token}`;
    
    const mailOptions = {
        to: email,
        subject: 'Validation Required for Your OpenPGP Key',
        from: config.smtp_mailaddress,
        text: `Hello,\n\nPlease validate your OpenPGP key by clicking the following link:\n\n${validationLink}\n\nThank you.`,
        html: `<p>Hello,</p><p>Please validate your OpenPGP key by clicking the following link:</p><p><a href="${validationLink}">${validationLink}</a></p><p>Thank you.</p>`,
    };

    try {
        // If a submission key is configured, sign/encrypt the mail if possible
        // Note: For simple validation links, plain text is often preferred for compatibility,
        // but we can add PGP encryption here if the user's public key is known.
        
        if (fs.existsSync(config.submission_key_path)) {
            const armoredKey = fs.readFileSync(config.submission_key_path, 'utf8');
            transporter.use('stream', openpgpEncrypt({
                privateKeyArmored: armoredKey,
                passphrase: config.submission_key_passphrase
            }));
        }

        await transporter.sendMail(mailOptions);
        logger.info(`Validation email sent to ${email}`);
    } catch (err) {
        logger.error(`Failed to send validation email to ${email}: ${err.message}`);
        throw err;
    }
}
