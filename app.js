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
import { openpgpEncrypt } from 'nodemailer-openpgp';

const app = express();

// TODO create submission-address

//check if certs and keys exist
async function checkFilesExist() {
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

if (!(await checkFilesExist())) {
    console.log('check your config');
    exit();
}

//create wkd skeleton for all domains in config.
function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    } catch (error) {
        console.error(`Error creating directory: ${error}`);
    }
}

function ensureFileExists(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '');
        }
    } catch (error) {
        console.error(`Error creating file: ${error}`);
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
if (config.smtp.sendmail == true) {
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

            //check recipients
            console.log('Recipients: ' + session.envelope.rcptTo);
            for (const recipient of session.envelope.rcptTo) {
                if (recipient.address !== config.smtp.mailaddress) {
                    console.log('Wrong recipient');
                    let err = new Error("Recipient not found.");
                    err.responseCode = 500;
                    return callback(err);
                }
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

                // Check if the email is encrypted by examining the Content-Type
                const contentType = parsed.headers.get('content-type');
                if (contentType && contentType.includes('multipart/encrypted')) {
                    console.log('Email is encrypted, attempting to decrypt');

                    try {
                        const privateKeyArmored = fs.readFileSync(config.pgpprivkey, 'utf8');
                        const passphrase = config.pgpkeypass;

                        // decrypt private key if it is encrypted
                        let decryptedPrivateKey;
                        if (!privateKeyArmored.isDecrypted()) {
                            decryptedPrivateKey = await openpgp.decryptKey({
                                privateKeyArmored,
                                passphrase
                            });
                        } else {
                            // Use the private key as is if it is already decrypted
                            decryptedPrivateKey = privateKeyArmored;
                        }

                        const message = await openpgp.readMessage({
                            armoredMessage: emailData
                        });

                        const { data: decrypted } = await openpgp.decrypt({
                            message,
                            decryptionKeys: decryptedPrivateKey

                        });

                        emailData = decrypted; // Use the decrypted data
                        console.log('Email decrypted successfully. Parse the decrypted mail.');

                        simpleParser(emailData, opt, async (err, reparsed) => {
                            if (err) throw err;
                            parsed = reparsed;
                        });
                    } catch (error) {
                        console.error('Failed to decrypt email:', error);
                        let err = new Error('Failed to decrypt email.');
                        err.responseCode = 500;
                        return callback(err);
                    }
                } else {
                    console.log('Email is not encrypted');
                }

                //search for attachment
                console.log('Message parsed');
                if (parsed.attachments) {
                    console.log('Attachment found');

                    //check if it's an valid openpgp key
                    const publicKeyArmored = parsed.attachments[0].content.toString();
                    let userIDs;
                    try {
                        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

                        // Check if the key has at least one user ID
                        userIDs = publicKey.getUserIDs();
                        if (userIDs.length !== 1) {
                            console.error("The OpenPGP key must have exactly one user ID.");
                            let err = new Error("The OpenPGP key must have exactly one user ID.");
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
                    console.log('Sender address matches user address in OpenPGP key');
                    //create wkd hash
                    const [smtpFromLocalpart, smtpFromDomain] = smtpFrom.split('@');
                    console.log(`Local part in SMTP: ${smtpFromLocalpart}`);
                    //echo -n name | sha1sum | cut -f1 -d" " | xxd -r -p | zbase32-encode
                    const wdkHash = zbase32.encode(crypto.createHash('sha1').update(smtpFromLocalpart).digest());
                    console.log(`WKD Hash: ${wdkHash}`);
                    //create token
                    const token = crypto.randomBytes(16).toString('hex');

                    // Save informations for validation and cert
                    try {
                        const domainDir = path.join(config.datadir, smtpFromDomain);
                        const pendingPath = path.join(domainDir, 'pending');
                        const wdkHashFile = path.join(pendingPath, wdkHash);
                        const requestsPath = path.join(config.datadir, 'requests');
                        const tokenFilePath = path.join(requestsPath, token);

                        // make sure folders exist
                        await fs.promises.mkdir(pendingPath, { recursive: true });
                        await fs.promises.mkdir(requestsPath, { recursive: true });

                        // Save public key in pending-file
                        await fs.promises.writeFile(wdkHashFile, publicKeyArmored);

                        // Create an save token file
                        const tokenFileContent = JSON.stringify({ domain: smtpFromDomain, wdkHash });
                        await fs.promises.writeFile(tokenFilePath, tokenFileContent);

                        callback(null); // success
                    } catch (error) {
                        console.error('Error saving validation data:', error);
                        const err = new Error('Error processing the key');
                        err.responseCode = 500;
                        callback(err);
                    }
                    
                    //create mail with validation link based on token
                    const privateKeyArmored = fs.readFileSync(config.pgpprivkey, 'utf8');
                    const passphrase = config.pgpkeypass;

                    const mailOptions = {
                        from: config.smtp.mailaddress, // Sender address
                        to: smtpFrom, // Receiver address (the sender of the original email)
                        subject: 'Validation Required for Your OpenPGP Key',
                        text:
`Hello,
                    
Please validate your OpenPGP key by clicking the following link:

https://${config.wksDomain}/api/${token}

Thank you.`,
                        html:
`<p>Hello,</p>
<p>Please validate your OpenPGP key by clicking the following link:</p>
<a href="https://${config.wksDomain}/api/${token}">Validate Key</a>
<p>Thank you.</p>`,
                    };

                    //send mail
                    transporter.use('stream', openpgpEncrypt({signingKey : privateKeyArmored, passphrase: passphrase}));
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.log('Error sending email:', error);
                            let err = new Error('Failed to send validation email.');
                            err.responseCode = 500;
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
    SNICallback: function (hostname, callback) {
        // Check if the first part of the domain is 'openpgpkey'
        const domainParts = hostname.split('.');
        if (domainParts[0] === 'openpgpkey') {
            // Remove the first part
            domainParts.shift();
        }
        const domain = domainParts.join('.'); // Reconstruct the domain without 'openpgpkey'

        let cert = fs.readFileSync(config.ServerDefaultCert);
        let key = fs.readFileSync(config.ServerDefaultKey);

        if (config.domains[domain]) {
            cert = fs.readFileSync(config.domains[domain].cert);
            key = fs.readFileSync(config.domains[domain].key);
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

const dataDir = path.resolve(config.datadir);

// MTA is seraching for a public key
app.get('/\.well-known/openpgpkey/:domain/hu/:hash', (req, res) => {
    console.log('Key search request');
    console.log(`Hostname: ${req.hostname}`);
    console.log(`Hash: ${req.params.hash}`);
    console.log(`Domain: ${req.params.domain}`);
    console.log(`Query: ${Object.entries(req.query)}`);

    const fileName = path.join(dataDir, req.params.domain, 'hu', req.params.hash);
    
    res.sendFile(fileName, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(404).send('File not found');
        } else {
            console.log('Sent:', fileName);
        }
    });
});

app.get('/\.well-known/openpgpkey/:domain/:file', (req, res) => {
    console.log(`Request for (${req.params.file})`);

    const fileName = path.join(dataDir, req.params.domain, req.params.file);

    res.sendFile(fileName, (err) => {
        if (err) {
            console.error('Error sending mail address');
            res.status(404).send('File not found');
        } else {
            console.log('Sent: ', fileName);
        }
    });
});

// User clicked on a validation link
app.get('/api/:token', async (req, res) => {
    const { token } = req.params;
    const tokenFilePath = `${config.datadir}/requests/${token}`;

    console.log("Validation completion initiated.");
    console.log(`Processing token: ${token}`);

    try {
        // Step 1: Read token file
        const data = await fs.promises.readFile(tokenFilePath, 'utf8');
        const parsedData = JSON.parse(data);

        const { domain, wdkHash } = parsedData;
        const sourcePath = path.join(config.datadir, domain, 'pending', wdkHash);
        const destinationPath = path.join(config.datadir, domain, 'hu', wdkHash);

        // Step 2: Move file from 'pending' to 'hu'
        await fs.promises.rename(sourcePath, destinationPath);
        console.log(`Key successfully moved from ${sourcePath} to ${destinationPath}`);

        // Step 3: Remove token file after processing
        await fs.promises.unlink(tokenFilePath);
        console.log(`Token file removed: ${tokenFilePath}`);

        // Send success response
        return res.status(200).send("Key has been saved on the server");

    } catch (err) {
        // Handle different error types more specifically
        if (err.code === 'ENOENT') {
            console.error(`File not found: ${err.path}`);
            return res.status(404).send("Requested file not found");
        } else {
            console.error(`Error processing request: ${err.message}`);
            return res.status(500).send("Error processing request");
        }
    }
});

app.get("*", (req, res) => {
    console.log(req);
    res.status(404).send("PAGE NOT FOUND");
});