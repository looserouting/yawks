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
        // 1. E-Mail-Adresse speichern oder finden
        const [emailAddress, created] = await sequelize.model.EmailAddresses.findOrCreate({
            where: { email: smtpFrom },
            defaults: { domain: smtpFromDomain }
        });
        if (created) {
           console.log(`New email address created: ${emailAddress.email}`);
        }
        // 2. Key speichern
        let key = await sequelize.model.Key.findOne({
            where: { email: emailAddress.email, wkd_hash: wkdHash }
        });
        if (!key) {
            key = await sequelize.model.Key.create({
                email: emailAddress.email,
                wkd_hash: wkdHash,
                status: 'pending'
            });
        }

        // 3. Key-Version speichern
        const latestVersion = await sequelize.model.KeyVersions.max('version', {
            where: { key_id: key.id }
        }) || 0;
        await sequelize.model.KeyVersions.create({
            key_id: key.id,
            public_key: publicKeyArmored,
            version: latestVersion + 1
        });

        // 4. Request speichern (Token für Validierung)
        await sequelize.model.Request.create({
            email: emailAddress.email,
            requested_key_id: key.id,
            token: token,
            status: 'pending'
        });

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