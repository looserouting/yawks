import * as openpgp from 'openpgp';
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { logger } from './logger.js';

/** @type {import('openpgp').PrivateKey | import('openpgp').PublicKey | null} */
let submissionKey = null;
/** @type {import('openpgp').PublicKey | null} */
let corporateRevocationKey = null;
/** @type {string | null} */
let corporateRevocationFingerprint = null;
/** @type {number | null} */
let corporateRevocationAlgorithm = null;

/**
 * Ensures that the submission key exists.
 * If not, it generates a new one.
 */
export async function ensureSubmissionKey() {
    const keyPath = config.submission_key_path || './submission.key';
    const absolutePath = path.resolve(process.cwd(), keyPath);

    if (fs.existsSync(absolutePath)) {
        logger.info(`Submission key found at ${absolutePath}`);
        await loadSubmissionKey(absolutePath);
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

        const pubPath = absolutePath + '.pub';
        fs.writeFileSync(pubPath, publicKey);
        logger.info(`New submission public key saved to ${pubPath}`);

        await loadSubmissionKey(absolutePath);
    } catch (err) {
        logger.error(`Failed to generate submission key: ${err.message}`);
        throw err;
    }
}

/**
 * Loads the submission key from disk.
 */
async function loadSubmissionKey(absolutePath) {
    const armoredKey = fs.readFileSync(absolutePath, 'utf-8');
    const passphrase = config.submission_key_passphrase || '';

    try {
        let privateKey = await openpgp.readPrivateKey({ armoredKey });
        if (passphrase) {
            privateKey = await openpgp.decryptKey({ privateKey, passphrase });
        }
        submissionKey = privateKey;
        logger.info(`Submission key loaded: ${submissionKey.getFingerprint().toUpperCase()}`);
    } catch {
        // Not a private key (or wrong passphrase), try as public key
        logger.warn('Could not read submission key as private key, loading as public key (signatures only)');
        submissionKey = await openpgp.readKey({ armoredKey });
        logger.info(`Submission key loaded as public key: ${submissionKey.getFingerprint().toUpperCase()}`);
    }
}

/**
 * Ensures the corporate revocation key is loaded.
 * If the key file doesn't exist, a warning is logged.
 * Call this after ensureSubmissionKey().
 */
export async function ensureCorporateRevocationKey() {
    const keyPath = config.corporate_revocation_key_path;
    if (!keyPath) {
        logger.warn('corporate_revocation_key_path is not configured – revocation enforcement disabled');
        return;
    }

    const absolutePath = path.resolve(process.cwd(), keyPath);

    if (!fs.existsSync(absolutePath)) {
        logger.warn(`Corporate revocation key not found at ${absolutePath} – revocation enforcement disabled`);
        return;
    }

    try {
        const armoredKey = fs.readFileSync(absolutePath, 'utf-8');
        corporateRevocationKey = await openpgp.readKey({ armoredKey });
        corporateRevocationFingerprint = corporateRevocationKey.getFingerprint().toUpperCase();
        corporateRevocationAlgorithm = corporateRevocationKey.getAlgorithmInfo().algorithm;

        logger.info(`Corporate revocation key loaded: ${corporateRevocationFingerprint} (algorithm: ${corporateRevocationAlgorithm})`);
    } catch (err) {
        logger.error(`Failed to load corporate revocation key: ${err.message}`);
        throw err;
    }
}

/**
 * Returns the fingerprint of the submission key.
 * @returns {string | null}
 */
export function getSubmissionKeyFingerprint() {
    if (!submissionKey) return null;
    return submissionKey.getFingerprint().toUpperCase();
}

/**
 * Returns the fingerprint of the corporate revocation key.
 * @returns {string | null}
 */
export function getCorporateRevocationFingerprint() {
    return corporateRevocationFingerprint;
}

/**
 * Returns the algorithm of the corporate revocation key.
 * @returns {number | null}
 */
export function getCorporateRevocationAlgorithm() {
    return corporateRevocationAlgorithm;
}

/**
 * Returns true if the corporate revocation key is loaded and available.
 * @returns {boolean}
 */
export function hasCorporateRevocationKey() {
    return corporateRevocationKey !== null;
}

/**
 * Sign a message with the submission key.
 * @param {string | Uint8Array} message
 * @returns {Promise<string>} armored signature
 */
export async function signMessage(message) {
    if (!submissionKey) {
        throw new Error('Submission key not loaded. Call ensureSubmissionKey() first.');
    }
    if (!submissionKey.isPrivate()) {
        throw new Error('Submission key is not a private key, cannot sign messages.');
    }

    const messageObj = await openpgp.createMessage({ text: message });
    const signedMessage = await openpgp.sign({
        message: messageObj,
        signingKeys: submissionKey
    });
    return signedMessage;
}

/**
 * Verify a signature made with the submission key.
 * @param {string} signedMessage - armored signed message
 * @returns {Promise<boolean>}
 */
export async function verifySignature(signedMessage) {
    if (!submissionKey) return false;
    try {
        const message = await openpgp.readMessage({ armoredMessage: signedMessage });
        const verificationResult = await openpgp.verify({
            message,
            verificationKeys: submissionKey
        });
        return verificationResult.signatures[0].verified;
    } catch (err) {
        logger.warn(`Signature verification failed: ${err.message}`);
        return false;
    }
}

/**
 * Verify a revocation certificate.
 * Checks that the certificate is signed by the corporate revocation key.
 * @param {Uint8Array | Buffer} binaryData - The binary revocation certificate
 * @returns {Promise<boolean>}
 */
export async function verifyRevocation(binaryData) {
    if (!config.enforce_revoker) {
        logger.info('enforce_revoker is false, accepting all revocation certificates');
        return true;
    }

    if (!corporateRevocationKey) {
        logger.warn('Corporate revocation key not loaded, rejecting revocation certificate');
        return false;
    }

    try {
        const signature = await openpgp.readSignature({ binary: binaryData });
        const verificationResult = await openpgp.verify({
            verificationKeys: corporateRevocationKey,
            signature
        });

        const verified = verificationResult.signatures[0]?.verified ?? false;
        if (verified) {
            logger.info('Revocation certificate verified against corporate revocation key');
        } else {
            logger.warn('Revocation certificate verification failed: not signed by corporate revocation key');
        }
        return verified;
    } catch (err) {
        logger.error(`Revocation certificate verification error: ${err.message}`);
        return false;
    }
}

/**
 * Extract the fingerprint of the key being revoked from a revocation certificate.
 * @param {Uint8Array | Buffer} binaryData
 * @returns {Promise<string | null>}
 */
export async function extractRevocationTarget(binaryData) {
    try {
        const signature = await openpgp.readSignature({ binary: binaryData });
        return signature.issuerFingerprint?.toUpperCase() ?? null;
    } catch (err) {
        logger.error(`Failed to extract revocation target: ${err.message}`);
        return null;
    }
}