var fs = require('node:fs');
var https = require('https');
var express = require('express');
const tls = require('node:tls');
const SMTPServer = require("smtp-server").SMTPServer;
const config = require("./config.js");
const simpleParser = require('mailparser').simpleParser;
const openpgp = require('openpgp');

var app = express();

const server = new SMTPServer({
    // secure: true,
    starttls: true,
    logger: true,
    authOptional: true,
    key: fs.readFileSync(config.ServerDefaultKey),
    cert: fs.readFileSync(config.ServerDefaultCert),

    async onData(stream, session, callback) {
        //check from
        stream.on('data', async (data) => {
            console.log('reading data');
            if (config.domains != null) {
                let allowed = false;
                for ( domain in config.domains) {
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
            if (session.envelope.rcptTo[0].address != config.smtp.mailaddress) {
                console.log('wrong receipient');
                return callback(new Error("Receipient not found.")); //TEST
            }
                
                
            options = {
                skipHtmlToText: true,
                skipTextToHtml: true,
                skipTextLinks: true
            }
            console.log('before parser');
            let parsed = await simpleParser(data, options);
            console.log('after parser')

            //search for .asc-file attachment
            if (parsed.attachments) {
                console.log('attachment found');
                console.log(parsed.attachment);
                //TODO check if it's an valid openpgp key (skip for now)
                const publicKeyArmored = 'attachment';
                //TODO mail address in key must match sender address
                //TODO get mail address from key and compatre to sender mail
                senderName = session.envelope.mailFrom.address.split("@")[0];
                //TODO create wkd hash
                //echo -n name | sha1sum | cut -f1 -d" " | xxd -r -p | zbase32-encode/zbase32-encode
                //TODO create token
                //TODO save cert in pending folder
                path = config.datadir + "/" + (session.envelope.mailFrom.address).split('@').pop() + '/pending/;
                fs.writeFile(path + hash, content, err => {} );
                //TODO create mail
                //TODO sign mail (skip for now)
                //TODO send mail with validation link and token
            }
        }); 
        // Accept the address
        stream.on('end', () => {
            console.log('stream end')
            return callback(null, "Message processed"); 
        })
        
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
