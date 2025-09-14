import { Router } from 'express';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import wkdController from '../../controller/wkdController/index.js';
import wksController from '../../controller/wksController/index.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WKD
// eslint-disable-next-line no-useless-escape
router.get('/\.well-known/openpgpkey/:domain/hu/:hash', wkdController.getPublicKey);
// eslint-disable-next-line no-useless-escape
router.get('/\.well-known/openpgpkey/:domain/submission-address', wkdController.getSubmissionAddress);

// WKS
// User clicks on confirmation link 
router.get('/api/:token', wksController.publishKey);

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
