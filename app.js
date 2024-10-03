import fs from 'node:fs';
import https from 'https';
import express from 'express';
import tls from 'node:tls';
import { SMTPServer } from "smtp-server";
import config from './config.js';
import { simpleParser } from 'mailparser';
import openpgp from 'openpgp';
import crypto from 'crypto';
import zbase32 from 'zbase32';

const app = express();

//TODO check if certs and keys exist
//TODO create wkd skeleton for all domains in config.

const allowedDomains = new Set(Object.keys(config.domains));
const server = new SMTPServer({
    starttls: true,
    logger: true,
    authOptional: true,
    key: fs.readFileSync(config.ServerDefaultKey),
    cert: fs.readFileSync(config.ServerDefaultCert),

    async onData(stream, session, callback) {
        let emailData = '';
        let smtpFrom = session.envelope.mailFrom.address;
        let fromDomain = session.envelope.mailFrom.address.split('@').pop();

        console.log('Reading data');
        console.log(`SMTP From: ${smtpFrom}`);

        if (allowedDomains.size > 0 && !allowedDomains.has(fromDomain)) {
            console.log('Domain is not allowed');
            return callback(new Error(`Your domain ${fromDomain} is not allowed to send mails to this server`));
        }
        console.log(`Domain is allowed: ${fromDomain}`);

        stream.on('data', (chunk) => {
            emailData += chunk;
        });

        stream.on('end', async () => {
            console.log('Stream end');

            //check receipient
            console.log('Recipients: ' + session.envelope.rcptTo); 
            if (session.envelope.rcptTo[0].address !== config.smtp.mailaddress) { //FIXME multiple recipients?
                console.log('Wrong recipient');
                return callback(new Error("Receipient not found.")); //TEST
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
                }

                //search for .asc-file attachment
                console.log('Message parsed');
                if (parsed.attachments) {
                    console.log('Attachment found');
                    //console.log(parsed.attachments);
                    //TODO check if it's an valid openpgp key (skip for now)
                    // contentType: 'applicatin/pgp-keys';                    
                    const publicKeyArmored = parsed.attachments[0].content.toString();
                    let userIDs;
                    try {
                        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
              
                        // Check if the key has at least one user ID
                        userIDs = publicKey.getUserIDs();
                        if (userIDs.length !== 1) {
                            console.error("The OpenPGP key must have exactly one user ID.");
                            return callback(new Error("The OpenPGP key must have exactlyone user ID."));
                        }
                
                        // Check if the key is expired
                        const expirationTime = publicKey.getExpirationTime();
                        if (expirationTime && expirationTime < new Date()) {
                            console.error("The OpenPGP key is expired.");
                            return callback(new Error("The OpenPGP key is expired."));
                        }
                
                        // Check if the key is revoked
                        const isRevoked = await publicKey.isRevoked();
                        if (isRevoked) {
                            console.error("The OpenPGP key is revoked.");
                            return callback(new Error("The OpenPGP key is revoked."));
                        }
                    } catch (error) {
                        console.log(`This is not a valid openpgp key: ${error}`);
                        return callback(new Error("Invalid OpenPGP key."));
                    }

                    //console.log(userIDs);
                    const pgpEmail = userIDs[0].match(/<([^>]+)>/)[1];
                    const [PGPlocalPart] = pgpEmail.split('@');
                    console.log(`Local part of the email in the OpenPGP key: ${PGPlocalPart}`);
                    //mail address in key must match sender address
                    if (smtpFrom !== pgpEmail) {
                        return callback(new Error("Key does not belong to the sender"));
                    }
                    //create wkd hash
                    const [smtpFromLocalpart] = smtpFrom.split('@');
                    console.log(`Local part in SMTP: ${smtpFromLocalpart}`);
                    //echo -n name | sha1sum | cut -f1 -d" " | xxd -r -p | zbase32-encode/zbase32-encode
                    const wdkHash = zbase32.encode(crypto.createHash('sha1').update(smtpFromLocalpart).digest());
                    console.log(`WKD Hash: ${wdkHash}`);
                    //create token
                    const token = crypto.randomBytes(16).toString('hex');
                    // save informations for validation
                    //TODO save cert in pending folder
                    let path = `${config.datadir}/${smtpFrom.split('@').pop()}/pending/`;
                    fs.writeFile(path + wdkHash, publicKeyArmored, err => {
                        console.log(err);
                    });

                    //TODO create mail
                    //TODO sign mail (skip for now)
                    //TODO send mail with validation link and token
                }
            });
            return callback(null, "Message processed"); 

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
app.get('/api/:token', (req, res) => {
    console.log("Validation completion");
    console.log(req.params.token);
    res.send("Blubb");
    // TODO search for pending validations in datenbase using the token
    // TODO if found move cert to hu folder
    // TODO send confirmation mail
});