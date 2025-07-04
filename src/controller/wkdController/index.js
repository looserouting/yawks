import path from 'path';
import config from '../../config.js';

function getPublicKey(req, res) {
    console.log('Key search request');
    console.log(`Hostname: ${req.hostname}`);
    console.log(`Hash: ${req.params.hash}`);
    console.log(`Domain: ${req.params.domain}`);
    console.log(`Query: ${Object.entries(req.query)}`);

    const fileName = path.join(config.directory, req.params.domain, 'hu', req.params.hash);
    
    res.sendFile(fileName, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(404).send('File not found');
        } else {
            console.log('Sent:', fileName);
        }
    });
}
function getSubmissionAddress(req, res) {
    console.log(`Request for (${req.params.file})`);

    const fileName = path.join(config.directory, req.params.domain, 'submission-address');

    res.sendFile(fileName, (err) => {
        if (err) {
            console.error('Error sending submission-address');
            res.status(404).send('File not found');
        } else {
            console.log('Sent: submission-address');
        }
    });
}

function getPolicy(req, res) {
    console.log('Request for policy');

    const fileName = path.join(config.directory, req.params.domain, 'policy');

    res.sendFile(fileName, (err) => {
        if (err) {
            console.error('Error sending policy');
            res.status(404).send('File not found');
        } else {
            console.log('Sent: policy');
        }
    });
};

export default {
    getPublicKey,
    getSubmissionAddress,
    getPolicy
}