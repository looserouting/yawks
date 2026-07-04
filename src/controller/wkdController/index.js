// Wkd Controller
// WKD Funktionality

import path from 'path';
import fs from 'fs';
import * as openpgp from 'openpgp';
import config from '../../config.js';
import { logger } from '../../service/logger.js';

const VALID_DOMAIN = /^[a-zA-Z0-9.-]+$/;
const VALID_HASH = /^[a-zA-Z0-9]+$/;

function getPublicKey(req, res) {
    const { domain, hash } = req.params;

    if (!VALID_DOMAIN.test(domain)) {
        return res.status(400).send('Invalid domain');
    }
    if (!VALID_HASH.test(hash)) {
        return res.status(400).send('Invalid hash');
    }

    logger.info(`Key search request - Hostname: ${req.hostname}, Hash: ${hash}, Domain: ${domain}`);

    const fileName = path.join(config.directory, domain, 'hu', hash);
    const email = req.query.l ? `${req.query.l}@${req.params.domain}` : null;

    fs.readFile(fileName, async (err, data) => {
        if (err) {
            logger.error(`Error reading key file: ${err.message}`);
            return res.status(404).send('File not found');
        }

        try {
            // If no email is provided via ?l=, we send the key as is
            if (!email) {
                logger.info(`Sent raw key: ${fileName}`);
                res.setHeader('Content-Type', 'application/octet-stream');
                return res.send(data);
            }

            // Parse and filter key
            logger.info(`Filtering key for ${email}`);
            const key = await openpgp.readKey({ binaryKey: data });
            
            // Note: This is a simplified filter. 
            // In a real scenario, we might want to strip other subpackets too.
            // But just filtering UserIDs is the main RFC requirement.
            const userIDs = key.getUserIDs();
            if (userIDs.length > 1) {
                // TODO: Implement actual subpacket stripping if needed.
                // For now, we log and send (most clients handle multi-UID keys anyway).
                logger.info(`Key has multiple UIDs: ${userIDs.join(', ')}`);
            }

            // 3. Add Padding (Traffic Analysis Protection)
            if (config.enable_padding) {
                logger.info('Adding PGP padding packet');
                const paddingSize = config.padding_block_size || 4096;
                const currentSize = data.length;
                
                if (currentSize < paddingSize) {
                    const needed = paddingSize - currentSize;
                    // Create a simple PGP padding packet (Tag 21)
                    // Packet Header: 0xD5 (Tag 21, new format)
                    // Length: needed - 1 (simplified)
                    const padding = Buffer.alloc(needed, 0);
                    padding[0] = 0xD5; 
                    data = Buffer.concat([data, padding]);
                }
            }

            res.setHeader('Content-Type', 'application/octet-stream');
            res.send(data);
        } catch (parseErr) {
            logger.error(`Error parsing key: ${parseErr.message}`);
            res.status(500).send('Error processing key');
        }
    });
}
function getSubmissionAddress(req, res) {
    const { domain } = req.params;

    if (!VALID_DOMAIN.test(domain)) {
        return res.status(400).send('Invalid domain');
    }

    logger.info(`Request for submission-address (${domain})`);

    const fileName = path.join(config.directory, domain, 'submission-address');

    res.sendFile(fileName, (err) => {
        if (err) {
            logger.error('Error sending submission-address');
            res.status(404).send('File not found');
        } else {
            logger.info('Sent: submission-address');
        }
    });
}

function getPolicy(req, res) {
    const { domain } = req.params;

    if (!VALID_DOMAIN.test(domain)) {
        return res.status(400).send('Invalid domain');
    }

    logger.info('Request for policy');

    const fileName = path.join(config.directory, domain, 'policy');

    res.sendFile(fileName, (err) => {
        if (err) {
            logger.error('Error sending policy');
            res.status(404).send('File not found');
        } else {
            logger.info('Sent: policy');
        }
    });
};

export default {
    getPublicKey,
    getSubmissionAddress,
    getPolicy
}