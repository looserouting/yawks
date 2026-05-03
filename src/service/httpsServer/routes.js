import { Router } from 'express';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import wkdController from '../../controller/wkdController/index.js';
import wksController from '../../controller/wksController/index.js';
import configController from '../../controller/configController.js';
import searchController from '../../controller/searchController.js';
import revocationController from '../../controller/revocationController.js';
import config from '../../config.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
    const apiKey = req.headers['x-admin-key'];
    if (apiKey === config.admin_api_key) {
        next();
    } else {
        res.status(401).send("Unauthorized: Admin access required");
    }
};

// CORS Middleware for WKD/WKS
router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// WKD
// eslint-disable-next-line no-useless-escape
router.get('/\.well-known/openpgpkey/:domain/hu/:hash', wkdController.getPublicKey);
// eslint-disable-next-line no-useless-escape
router.get('/\.well-known/openpgpkey/:domain/submission-address', wkdController.getSubmissionAddress);
// eslint-disable-next-line no-useless-escape
router.get('/\.well-known/openpgpkey/:domain/hu/policy', wkdController.getPolicy);

// Direct Discovery Fallback (no domain in path)
// eslint-disable-next-line no-useless-escape
router.get('/\.well-known/openpgpkey/hu/:hash', (req, res, next) => {
    // If domain is not in path, we try to use the hostname
    req.params.domain = req.hostname;
    wkdController.getPublicKey(req, res, next);
});

// WKS
// User clicks on confirmation link 
router.get('/api/:token', wksController.publishKey);

// Public Config
router.get('/api/config/info', configController.getPublicConfig);

// Key Submission
router.post('/api/key/submit', express.json(), wksController.submitKey);

// Search
router.get('/api/search', searchController.searchKeys);

// Admin Revocation
router.post('/api/admin/revoke', express.json(), adminAuth, revocationController.revokeKey);

// Keyserver
// to be continued...

// Serve static files
router.use(express.static(path.join(__dirname, 'public')));

// Default Page - serve index.html for root
router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 for other routes
router.get("*", (req, res) => {
    res.status(404).send("PAGE NOT FOUND");
});

export default router;
