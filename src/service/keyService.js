
import * as openpgp from 'openpgp';
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { logger } from './logger.js';

/**
 * Ensures that the submission key exists.
 * If not, it generates a new one.
 */
export async function ensureSubmissionKey() {
    const keyPath = config.submission_key_path || './submission.key';
    const absolutePath = path.resolve(process.cwd(), keyPath);

    if (fs.existsSync(absolutePath)) {
        logger.info(`Submission key found at ${absolutePath}`);
        return;
    }

    logger.info(`Submission key not found. Generating new key for ${config.smtp_mailaddress}...`);

    try {
        const { privateKey, publicKey } = await openpgp.generateKey({
            type: 'ecc',
            curve: 'ed25519',
            userIDs: [{ name: 'YAWKS Submission Key', email: config.smtp_mailaddress }],
            passphrase: config.submission_key_passphrase || ''
        });

        fs.writeFileSync(absolutePath, privateKey);
        logger.info(`New submission private key saved to ${absolutePath}`);

        // We could also save the public key, but WKD will serve it from the DB/directory later
        const pubPath = absolutePath + '.pub';
        fs.writeFileSync(pubPath, publicKey);
        logger.info(`New submission public key saved to ${pubPath}`);

    } catch (err) {
        logger.error(`Failed to generate submission key: ${err.message}`);
        throw err;
    }
}
