import crypto from 'crypto';
import zbase32 from 'zbase32';
import * as openpgp from 'openpgp';
import { sequelize } from '../../model/index.js';


export function createWkdHash(smtpFromLocalpart) {
    console.log(`Local part in SMTP: ${smtpFromLocalpart}`);
    const wdkHash = zbase32.encode(crypto.createHash('sha1').update(smtpFromLocalpart).digest());
    console.log(`WKD Hash: ${wdkHash}`);
    return wdkHash;
}

export async function saveValidationData(smtpFrom, smtpFromDomain, wkdHash, publicKeyArmored, token, callback) {
    try {
        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
        const fingerprint = publicKey.getFingerprint();

        // TODO check if an key with same fingerprint already exists
        let key = await sequelize.models.Key.findOne({
            where: { fingerprint: fingerprint }
        });
        // TODO check if key is already published

        if (!key) {
            key = await sequelize.models.Key.create({
                email: smtpFrom,
                wkd_hash: wkdHash,
                fingerprint: fingerprint,
                domain: smtpFromDomain,
                key: publicKeyArmored,
                token: token    
            });
            console.log(`New Key with fingertprint ${fingerprint} created for ${smtpFrom}`);
        } else {
            console.log(`Key with fingerprint ${fingerprint} allready exists.`);
            const err = new Error('Key with fingerprint ${fingerprint} allready exists.');
            err.responseCode = 500;
            callback(err);
        }

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