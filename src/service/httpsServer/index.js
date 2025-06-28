// httpsServer.js
import config from '../../config.js';
import fs from 'node:fs';
import https from 'https';
import tls from 'node:tls';
import express from 'express';
import routes from './routes.js'; 

const app = express();
app.use(routes)

const options = {
    SNICallback: function (hostname, callback) {

        let cert = fs.readFileSync(config.domains[Object.keys(config.domains)[0]].DomainCert);
        let key = fs.readFileSync(config.domains[Object.keys(config.domains)[0]].DomainKey);

        if (config.domains[hostname]) {
            cert = fs.readFileSync(config.domains[hostname].DomainCert);
            key = fs.readFileSync(config.domains[hostname].DomainKey);
        }

        callback(null, tls.createSecureContext({
            cert,
            key,
        }));
    }
};

const httpsService = https.createServer(options, app);

export default httpsService;