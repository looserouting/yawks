
import config from '../config.js';

function getPublicConfig(req, res) {
    res.json({
        domains: config.domains,
        corporate_revocation_fingerprint: config.corporate_revocation_fingerprint,
        corporate_revocation_algorithm: config.corporate_revocation_algorithm,
        enforce_revoker: config.enforce_revoker
    });
}

export default {
    getPublicConfig
};
