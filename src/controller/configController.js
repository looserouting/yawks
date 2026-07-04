
import config from '../config.js';
import { getCorporateRevocationFingerprint, getCorporateRevocationAlgorithm } from '../service/keyService.js';

function getPublicConfig(req, res) {
    res.json({
        domains: config.domains,
        corporate_revocation_fingerprint: getCorporateRevocationFingerprint(),
        corporate_revocation_algorithm: getCorporateRevocationAlgorithm(),
        enforce_revoker: config.enforce_revoker
    });
}

export default {
    getPublicConfig
};
