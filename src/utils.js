import fs from 'node:fs';
import path from 'path';
import crypto from 'crypto';
import zbase32 from 'zbase32';
import openpgp from 'openpgp';
import config from './config.js';

export function createWkdHash(smtpFromLocalpart) {
    console.log(`Local part in SMTP: ${smtpFromLocalpart}`);
    const wdkHash = zbase32.encode(crypto.createHash('sha1').update(smtpFromLocalpart).digest());
    console.log(`WKD Hash: ${wdkHash}`);
    return wdkHash;
}

export async function saveValidationData(smtpFromDomain, wdkHash, publicKeyArmored, callback) {
    try {
        const domainDir = path.join(config.datadir, smtpFromDomain);
        const pendingPath = path.join(domainDir, 'pending');
        const wdkHashFile = path.join(pendingPath, wdkHash);
        const requestsPath = path.join(config.datadir, 'requests');
        const token = crypto.randomBytes(16).toString('hex');
        const tokenFilePath = path.join(requestsPath, token);

        // Make sure folders exist
        await fs.promises.mkdir(pendingPath, { recursive: true });
        await fs.promises.mkdir(requestsPath, { recursive: true });

        // Save public key in pending-file
        await fs.promises.writeFile(wdkHashFile, publicKeyArmored);

        // Create and save token file
        const tokenFileContent = JSON.stringify({ domain: smtpFromDomain, wdkHash });
        await fs.promises.writeFile(tokenFilePath, tokenFileContent);

        callback(null, token); // success
    } catch (error) {
        console.error('Error saving validation data:', error);
        const err = new Error('Error processing the key');
        err.responseCode = 500;
        callback(err);
    }
}

export async function getValidKey(parsed, smtpFrom) {
    if (!parsed.attachments || parsed.attachments.length === 0) {
        console.log('No attachments found');
        return new Error('No attachments found');
    }

    console.log('Attachment found');
    const publicKeyArmored = parsed.attachments[0].content.toString();

    try {
        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

        // Check if the key has exactly one user ID
        const userIDs = publicKey.getUserIDs();
        if (userIDs.length !== 1) {
            console.error("The OpenPGP key must have exactly one user ID.");
            return new Error("The OpenPGP key must have exactly one user ID.");
        }

        // Check if the key is expired
        const expirationTime = publicKey.getExpirationTime();
        if (expirationTime && expirationTime < new Date()) {
            console.error("The OpenPGP key is expired.");
            return new Error("The OpenPGP key is expired.");
        }

        // Check if the key is revoked
        const isRevoked = await publicKey.isRevoked();
        if (isRevoked) {
            console.error("The OpenPGP key is revoked.");
            return new Error("The OpenPGP key is revoked.");
        }

        const pgpEmail = userIDs[0].match(/<([^>]+)>/)[1];
        console.log(`Email in the OpenPGP key: ${pgpEmail}`);

        // Mail address in key must match sender address
        if (smtpFrom !== pgpEmail) {
            console.error("Key does not belong to the sender");
            return new Error("Key does not belong to the sender");
        }

        console.log('Sender address matches user address in OpenPGP key');
        return publicKey;
    } catch (error) {
        console.log(`This is not a valid openpgp key: ${error}`);
        return new Error("Invalid OpenPGP key.");
    }
}