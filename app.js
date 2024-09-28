var fs = require('node:fs');
var https = require('https');
var express = require('express');
const tls = require('node:tls');
const SMTPServer = require("smtp-server").SMTPServer;
const config = require("./config.js");
const simpleParser = require('mailparser').simpleParser;

var app = express();

const server = new SMTPServer({
    secure: true,
    authOptional: true,
    key: fs.readFileSync(config.ServerDefaultKey),
    cert: fs.readFileSync(config.ServerDefaultCert),

    onConnect(address, session, callback) {
        //check from
        if (config.domains != null) {
            let allowed = false;
            config.domains.forEach( (domain) => {
                if (session.envelope.mailFrom.address == domain) {
                    allowed = true;
                }
            })
            if (!allowed) {
                return callback(new Error("Your domain (" + session.envelope.mailFrom.address + ") is not allowed to send mails to this server"));
            }
        }
        //check receipient
        if (session.envelope.rcptTo.address != config.smtp.mailaddress)
            return callback(new Error("Receipient not found.")); 
           
        // Accept the address
        return callback(); 
    },
    async onData(stream, session, callback) {
        options = {
            skipHtmlToText: true,
            skipTextToHtml: true,
            skipTextLinks: true
        }
        let parsed = await simpleParser(stream, options);
        
        //search for .asc-file attachment
        if (parsed.attachments) {
            //TODO check if its an valid openpgp key
            //TODO save cert in pending folder
            path = config.datadir + "/" + session.envelope.mailFrom; //FIXME
            //TODO create token
            //TODO create mail
            //TODO sign mail
            //TODO send mail with validation link and token
        }
    },
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