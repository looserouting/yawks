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

var app = express();

const server = new SMTPServer({
    // secure: true,
    starttls: true,
    logger: true,
    authOptional: true,
    key: fs.readFileSync(config.ServerDefaultKey),
    cert: fs.readFileSync(config.ServerDefaultCert),

    async onData(stream, session, callback) {
        let emailData = '';
        let smtpFrom = session.envelope.mailFrom.address;
        console.log('reading data');
        console.log('SMTP From: ' + smtpFrom);

        
        stream.on('data', (chunk) => {
            emailData += chunk;
        });

        stream.on('end', async () => {
            console.log('stream end')
            if (config.domains != null) {
                let allowed = false;
                for ( let domain in config.domains) {
                    if ((session.envelope.mailFrom.address).split('@').pop() == domain) {
                        console.log('domain is allowed: ' + (session.envelope.mailFrom.address).split('@').pop());
                        allowed = true;
                    }
                }
                if (!allowed) {
                    console.log('domain is not allowed');
                    return callback(new Error("Your domain (" + (session.envelope.mailFrom.address).split('@').pop() + ") is not allowed to send mails to this server")); //TEST
                }
            }

            //check receipient
            console.log('receipients: ' + session.envelope.rcptTo); 
            if (session.envelope.rcptTo[0].address != config.smtp.mailaddress) { //FIXME multiple recipients?
                console.log('wrong receipient');
                return callback(new Error("Receipient not found.")); //TEST
            }

            let opt = {
                skipHtmlToText: true,
                skipTextToHtml: true,
                skipTextLinks: true
            }
            console.log(smtpFrom);
            simpleParser(emailData, opt, (err, parsed) => {
                if (err)
                    console.log(err);
                //search for .asc-file attachment
                console.log('Message parsed');
                if (parsed.attachments) {
                    console.log('attachment found');
                    //TODO check if it's an valid openpgp key (skip for now)
                    const publicKeyArmored = 'attachment';
                    //TODO mail address in key must match sender address
                    //TODO get mail address from key and compare to sender mail
                    const [smtpFromLocalpart] = smtpFrom.split('@');
                    console.log('Local part: ' + smtpFromLocalpart);
                    //TODO create wkd hash
                    //echo -n name | sha1sum | cut -f1 -d" " | xxd -r -p | zbase32-encode/zbase32-encode
                    let wdkHash = crypto.createHash('sha1').update(smtpFromLocalpart);
                    wdkHash = zbase32.encode(new TextEncoder('utf-8').encode(wdkHash));
                    console.log(wdkHash);
                    //TODO create token
                    let token = '';
                    //TODO save cert in pending folder
                    let path = config.datadir + "/" + smtpFrom.split('@').pop() + '/pending/';
                   
                    /*
                    fs.writeFile(path + wdkHash, content, err => {
                        console.log(err);
                    });
                    */

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
    }
)
server.listen(25, ()=> console.log('smtp server started'));

var options = {
    SNICallback: function (domain, callback) {
        let cert = fs.readFileSync(config.ServerDefaultCert);
        let key = fs.readFileSync(config.ServerDefaultKey);

        if (config.domains[domain]) {
            key = fs.readFileSync(config.domains[domain].key),
            cert = fs.readFileSync(config.domains[domain].cert)
        }

        callback(null, new tls.createSecureContext({
            cert,
            key,
        }));
    },
    path: '/'
}

var httpsServer = https.createServer(options, app);
httpsServer.listen(443, ()=> console.log('https server startet'));

// MTA is seraching for a public key
app.get('/\.well-known/openpgpkey/:domain/hu/:hash', (req, res) => {
    console.log("Key search request")
    console.log('Hostname: ' + req.hostname);
    console.log('Hash: ' + req.params.hash);
    console.log('Domain: ' + req.params.domain);
    console.log('Query: ' + Object.entries(req.query));
    const fileName = config.datadir + '/' + config.domains[req.params.domain] + '/' + req.params.hash;
    res.sendFile(fileName, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.statusCode(404);
        } else {
            console.log('Sent:', fileName);
        }
    });
})

// User clicked on a validation link
app.get('/api/:token', (req, res) => {
    console.log("Validation completition")
    console.log(req.params.token);
    res.send("Blubb");
    // TODO search for pending validations in datenbase using the token
    // TODO if found move cert to hu folder
    // TODO send confirmation mail
})
