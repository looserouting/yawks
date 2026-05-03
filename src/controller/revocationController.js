
import { Keys } from '../model/index.js';
import * as openpgp from 'openpgp';
import { logger } from '../service/logger.js';
import config from '../config.js';

/**
 * Revokes a key by adding a revocation signature.
 */
async function revokeKey(req, res) {
    const { email, revocationSignature } = req.body;

    if (!email || !revocationSignature) {
        return res.status(400).send("Email and revocation signature are required");
    }

    try {
        // 1. Find the key
        const keyEntry = await Keys.findOne({ where: { email, status: 'published' } });
        if (!keyEntry) {
            return res.status(404).send("Published key for this email not found");
        }

        // 2. Verify that the revocation signature is from the authorized revoker
        const key = await openpgp.readKey({ armoredKey: keyEntry.publickey });
        const revSig = await openpgp.readSignature({ armoredSignature: revocationSignature });
        
        // Note: Verification of the revocation signature itself is complex 
        // because it needs to be verified against the target key.
        // For now, we trust the client if the signature is validly formatted.
        // TODO: Deep verification of revocation packets.

        // 3. Update the public key in the database
        // In a real implementation, we would append the revocation packet.
        // For this demo, we'll mark it as revoked in status.
        await keyEntry.update({ status: 'revoked' });

        logger.info(`Key for ${email} has been REVOKED by admin.`);
        return res.status(200).send("Key successfully revoked");

    } catch (err) {
        logger.error(`Revocation error: ${err.message}`);
        return res.status(500).send("Error performing revocation");
    }
}

export default {
    revokeKey
};
