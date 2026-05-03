import { sequelize } from '../../model/index.js';
import * as openpgp from 'openpgp';
import crypto from 'crypto';
import zbase32 from 'zbase32';
import config from '../../config.js';
import { logger } from '../../service/logger.js';
import { sendValidationEmail } from '../../service/mailService.js';

// Function to handle key validation
async function publishKey(req, res) {
    const { token } = req.params;
    // TODO store request in Database (sequelize->Requests)

    logger.info("Validation completion initiated.");
    logger.info(`Processing token: ${token}`);

    try {
        // Step 1: Find token in Requests table
        const request = await sequelize.models.Request.findOne({ where: { token } });
        if (!request) {
            return res.status(404).send("Token not found in Requests");
        }

        // Step 2: Check if request is still pending
        if (request.status !== 'pending') {
            return res.status(400).send("Request is not pending and cannot be activated");
        }

        // Step 3: Activate the key (set status to 'published')
        const key = await sequelize.models.Key.findOne({ where: { id: request.requested_key_id } });
        if (!key) {
            return res.status(404).send("Key not found for this request");
        }

        await key.update({ status: 'published' });

        // Step 4: Set activation_date in KeyVersions
        await sequelize.models.KeyVersions.update(
            { activation_date: new Date(), status: 'active' },
            { where: { key_id: key.id } }
        );

        // Step 5: Set request status to 'approved'
        await request.update({ status: 'approved', processed_at: new Date() });

        // Send success response
        return res.status(200).send("Key has been activated, KeyVersion updated, and request approved");

    } catch (err) {
        // Handle different error types more specifically
        if (err.code === 'ENOENT') {
            logger.error(`File not found: ${err.path}`);
            return res.status(404).send("Requested file not found");
        } else {
            logger.error(`Error processing request: ${err.message}`);
            return res.status(500).send("Error processing request");
        }
    }
};

// Function to handle key submission via API
async function submitKey(req, res) {
    const { publicKey, email, signature, challenge } = req.body;

    if (!publicKey || !email) {
        return res.status(400).send("Public key and email are required");
    }

    if (!signature || !challenge) {
        return res.status(400).send("Signature and challenge are required for verification");
    }

    try {
        // 1. Parse Key
        const key = await openpgp.readKey({ armoredKey: publicKey });
        
        // 2. Verify Signature Proof
        const message = await openpgp.createMessage({ text: challenge });
        const verification = await openpgp.verify({
            message,
            signature: await openpgp.readSignature({ armoredSignature: signature }),
            verificationKeys: key
        });

        const isValid = await verification.signatures[0].verified;
        if (!isValid) {
            logger.warn(`Invalid ownership proof for ${email}`);
            return res.status(401).send("Invalid signature: Ownership proof failed");
        }

        logger.info(`Ownership proof verified for ${email}`);

        const fingerprint = key.getFingerprint();
        const userIDs = key.getUserIDs();
        
        // Verify email matches one of the UserIDs
        if (!userIDs.some(id => id.includes(email))) {
            return res.status(400).send("Email does not match any UserID in the key");
        }

        // 3. Verify Domain is allowed
        const [localPart, domain] = email.split('@');
        const allowedDomains = new Set(config.domains);
        if (!allowedDomains.has(domain)) {
            logger.warn(`Unauthorized domain submission attempt: ${domain}`);
            return res.status(403).send(`Domain ${domain} is not authorized for this keyserver`);
        }

        // 4. Generate WKD Hash
        const hash = crypto.createHash('sha1').update(localPart.toLowerCase()).digest();
        const wkdHash = zbase32.encode(hash);

        // 3. Create Token
        const token = crypto.randomBytes(16).toString('hex');

        // 4. Save to Database
        // Note: Using findOrCreate or upsert might be better
        const [keyEntry, created] = await sequelize.models.Keys.findOrCreate({
            where: { wkdHash, domain },
            defaults: {
                email,
                publickey: publicKey,
                status: 'pending',
                fingerprint: fingerprint,
                keycreationtime: key.getCreationTime()
            }
        });

        if (!created) {
            await keyEntry.update({
                publickey: publicKey,
                status: 'pending',
                fingerprint: fingerprint,
                keycreationtime: key.getCreationTime()
            });
        }

        await sequelize.models.Request.create({
            token,
            email,
            status: 'pending',
            requested_key_id: wkdHash
        });

        logger.info(`Key submission received for ${email}. Token: ${token}`);

        // 5. Send Validation Email
        await sendValidationEmail(email, token);

        // 6. Success response
        return res.status(200).json({
            message: "Key submitted successfully. Please check your email for verification."
        });

    } catch (err) {
        logger.error(`Error submitting key: ${err.message}`);
        return res.status(500).send("Error processing key submission: " + err.message);
    }
}

export default {
    publishKey,
    submitKey
}