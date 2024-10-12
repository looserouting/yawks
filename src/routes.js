import path from 'path';
import fs from 'node:fs';
import config from '../config.js';

const dataDir = path.resolve(config.datadir);

export default function setupRoutes(app) {
    // MUA is searching for a public key
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
}