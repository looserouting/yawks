import fs from 'node:fs';
import path from 'path';
import https from 'https';
import express from 'express';
import tls from 'node:tls';
import { SMTPServer } from "smtp-server";
import config from './config.js';
import { simpleParser } from 'mailparser';
import openpgp from 'openpgp';
import crypto from 'crypto';
import zbase32 from 'zbase32';
import nodemailer from 'nodemailer';
import { exit } from 'node:process';

const app = express();

//TODO check if certs and keys exist
function checkFilesExist() {
    const filesToCheck = [
        config.ServerDefaultKey,
        config.ServerDefaultCert,
        config.pgpprivkey,
        config.pgppubkey,
        ...Object.values(config.domains).flatMap(domain => [domain.cert, domain.key])
    ];

    const missingFiles = filesToCheck.filter(filePath => filePath && !fs.existsSync(filePath));

    if (missingFiles.length > 0) {
        console.log('The following files are missing:', missingFiles);
        return false;
    }

    console.log('All files exist.');
    return true;
}

if (!checkFilesExist()) {
    console.log('check your config');
    exit();
}

//TODO create wkd skeleton for all domains in config.
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '');
    }
}

function setupDirectories() {
    const datadir = config.datadir;
    const requestsDir = path.join(datadir, 'requests');
    ensureDirectoryExists(requestsDir);

    for (const domain in config.domains) {
        const domainDir = path.join(datadir, domain);
        const huDir = path.join(domainDir, 'hu');
        const pendingDir = path.join(domainDir, 'pending');
        const policyFile = path.join(domainDir, 'policy');

        ensureDirectoryExists(domainDir);
        ensureDirectoryExists(huDir);
        ensureDirectoryExists(pendingDir);
        ensureFileExists(policyFile);
    }
}

// Call the function to set up directories
setupDirectories();

var transporter;
if (config.sendmail == true) {
    transporter = nodemailer.createTransport({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail'
    });
} else {
    transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: false,
        auth: {
            user: config.smtp.auth,
            pass: config.smtp.pass
        }
    });
}


const allowedDomains = new Set(Object.keys(config.domains));
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

            //check receipient
            console.log('Recipients: ' + session.envelope.rcptTo);
            if (session.envelope.rcptTo[0].address !== config.smtp.mailaddress) { //FIXME multiple recipients?
                console.log('Wrong recipient');
                let err = new Error("Receipient not found.");
                err.responseCode = 500;
                return callback(err);
            }

            let opt = {
                skipHtmlToText: true,
                skipTextToHtml: true,
                skipTextLinks: true
            };

            console.log(smtpFrom);
            simpleParser(emailData, opt, async (err, parsed) => {
                if (err) {
                    console.log(err);
                    let error = new Error('Could not parse the mail')
                    error.responseCode = 500;
                    return callback(error);
                }

                //search for .asc-file attachment
                console.log('Message parsed');
                if (parsed.attachments) {
                    console.log('Attachment found');
                    //console.log(parsed.attachments);
                    //check if it's an valid openpgp key
                    const publicKeyArmored = parsed.attachments[0].content.toString();
                    let userIDs;
                    try {
                        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

                        // Check if the key has at least one user ID
                        userIDs = publicKey.getUserIDs();
                        if (userIDs.length !== 1) {
                            console.error("The OpenPGP key must have exactly one user ID.");
                            let err = new Error("The OpenPGP key must have exactlyone user ID.");
                            err.responseCode = 500;
                            return callback(err);
                        }

                        // Check if the key is expired
                        const expirationTime = publicKey.getExpirationTime();
                        if (expirationTime && expirationTime < new Date()) {
                            console.error("The OpenPGP key is expired.");
                            let err = new Error("The OpenPGP key is expired.");
                            err.responseCode = 500;
                            return callback(err);
                        }

                        // Check if the key is revoked
                        const isRevoked = await publicKey.isRevoked();
                        if (isRevoked) {
                            console.error("The OpenPGP key is revoked.");
                            let err = new Error("The OpenPGP key is revoked.");
                            err.responseCode = 500;
                            return callback(err);
                        }
                    } catch (error) {
                        console.log(`This is not a valid openpgp key: ${error}`);
                        let err = new Error("Invalid OpenPGP key.");
                        err.responseCode = 500;
                        return callback(err);
                    }

                    //console.log(userIDs);
                    const pgpEmail = userIDs[0].match(/<([^>]+)>/)[1];
                    console.log(`Email in the OpenPGP key: ${pgpEmail}`);
                    //mail address in key must match sender address
                    if (smtpFrom !== pgpEmail) {
                        let err = new Error("Key does not belong to the sender");
                        err.responseCode = 500;
                        return callback(err);
                    }

                    //create wkd hash
                    const [smtpFromLocalpart, smtpFromDomain] = smtpFrom.split('@');
                    console.log(`Local part in SMTP: ${smtpFromLocalpart}`);
                    //echo -n name | sha1sum | cut -f1 -d" " | xxd -r -p | zbase32-encode
                    const wdkHash = zbase32.encode(crypto.createHash('sha1').update(smtpFromLocalpart).digest());
                    console.log(`WKD Hash: ${wdkHash}`);
                    //create token
                    const token = crypto.randomBytes(16).toString('hex');

                    // Save informations for validation and cert
                    let path = `${config.datadir}/${smtpFromDomain}`;
                    fs.promises.writeFile(`${path}/pending/${wdkHash}`, publicKeyArmored, (error) => {
                        if (error) {
                            console.log(error);
                            let err = new Error('Error processing the key');
                            err.responseCode = 500;
                            return callback(err);
                        } else {
                            const tokeFile = `{domain: ${smtpFromDomain}, wdkHash: ${wdkHash}}`;
                            fs.promises.writeFile(`${config.datadir}/requests/${token}`, tokeFile, (error) => {
                                if (error) {
                                    console.log(error);
                                    let err = new Error('Error processing the key');
                                    err.responseCode = 500;
                                    return callback(err);
                                }
                            });
                        }
                    });
                    
                    //create mail with validation link based on token
                    const mailOptions = {
                        from: config.smtp.mailaddress, // Sender address
                        to: smtpFrom, // Receiver address (the sender of the original email)
                        subject: 'Validation Required for Your OpenPGP Key',
                        text: `Hello,
                    
Please validate your OpenPGP key by clicking the following link:

https://localhost/validate?token=${token}

Thank you.`,
                        html: `<p>Hello,</p>
<p>Please validate your OpenPGP key by clicking the following link:</p>
<a href="https://localhost/validate?token=${token}">Validate Key</a>
<p>Thank you.</p>`
                    };
                    //sign mail
                    const privateKeyArmored = fs.readFileSync(config.pgpprivkey, 'utf8'); // Load the private key from file
                    const passphrase = config.pgpkeypass;
                    const privateKey = await openpgp.decryptKey({
                        privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
                        passphrase
                    });

                    const mimeMessage = `Content-Type: multipart/alternative; boundary="boundary"
    
--boundary
Content-Type: text/plain; charset="utf-8"

${mailOptions.text}

--boundary
Content-Type: text/html; charset="utf-8"

${mailOptions.html}

--boundary--`;

                    const signed = await openpgp.sign({
                        message: await openpgp.createCleartextMessage({ text: mimeMessage }), // Cleartext message
                        signingKeys: privateKey
                    });

                    mailOptions.text = signed; // Replace the plain text with the signed message
                    mailOptions.html = ''; // Clear the HTML part since it's included in the signed message

                    //send mail
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.log('Error sending email:', error);
                            let err = new Error('Failed to send validation email.');
                            err.responeCode = 500;
                            return callback(err);
                        }
                        console.log('Validation email sent:', info.response);
                    });
                }
            });
            return callback(null, "Message processed and validation email sent.");
        });
    }
});

server.on('error', (err) => {
    console.log("Error %s", err.message);
});

server.listen(25, () => console.log('SMTP server started'));

const options = {
    SNICallback: function (domain, callback) {
        let cert = fs.readFileSync(config.ServerDefaultCert);
        let key = fs.readFileSync(config.ServerDefaultKey);

        if (config.domains[domain]) {
            key = fs.readFileSync(config.domains[domain].key);
            cert = fs.readFileSync(config.domains[domain].cert);
        }

        callback(null, tls.createSecureContext({
            cert,
            key,
        }));
    },
    path: '/'
};

const httpsServer = https.createServer(options, app);
httpsServer.listen(443, () => console.log('HTTPS server started'));

// MTA is seraching for a public key
app.get('/\.well-known/openpgpkey/:domain/hu/:hash', (req, res) => {
    console.log('Key search request');
    console.log(`Hostname: ${req.hostname}`);
    console.log(`Hash: ${req.params.hash}`);
    console.log(`Domain: ${req.params.domain}`);
    console.log(`Query: ${Object.entries(req.query)}`);
    const fileName = `${config.datadir}/${config.domains[req.params.domain]}/${req.params.hash}`;
    res.sendFile(fileName, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(404).send('File not found');
        } else {
            console.log('Sent:', fileName);
        }
    });
});

// User clicked on a validation link
app.get('/api/:token', async (req, res) => {
    try {
        console.log("Validation completion");
        console.log(req.params.token);
        
        // Search for pending validations using the token. when found copy to hu
        const tokenFile = `${config.datadir}/requests/${req.params.token}`;
        const data = await fs.promises.readFile(tokenFile);
        console.log(data);
        try {
            await fs.promises.rename(data.wdkHash, `${config.datadir}/${data.domain}/hu/${data.wdkHash}`);
            console.log(`Key moved to ${config.datadir}/${data.domain}/hu/${data.wdkHash}`);
            await fs.promises.unlink(tokenFile);
            console.log(`Remove token file: ${tokenFile}`);
        } catch (err) {
            console.error(err);
            res.status(500).send("Error processing request");
        }
        res.send("Key has been saved on the server");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing request");
    }
});