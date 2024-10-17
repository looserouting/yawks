// httpsServer.js
import fs from 'node:fs';
import https from 'https';
import tls from 'node:tls';
import express from 'express';

const app = express();

const options = {
    SNICallback: function (hostname, callback) {
        const domainParts = hostname.split('.');
        if (domainParts[0] === 'openpgpkey') {
            domainParts.shift();
        }
        const domain = domainParts.join('.');

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

export default httpsServer;