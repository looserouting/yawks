// httpsServer.js
import config from '../../config.js';
import https from 'https';
import tls from 'node:tls';
import express from 'express';
import routes from './routes.js'; 

const app = express();
app.use(routes)

const options = {
    SNICallback: function (hostname, callback) {

        let cert = Object.keys(config.domains)[0].DomainCert;
        let key = Object.keys(config.domains)[0].DomainKey;

        if (config.domains[hostname]) {
            cert = config.domains[hostname].DomainCert;
            key = config.domains[hostname].DomainKey;
        }

        callback(null, tls.createSecureContext({
            cert,
            key,
        }));
    }
};

const httpsService = https.createServer(options, app);

export default httpsService;