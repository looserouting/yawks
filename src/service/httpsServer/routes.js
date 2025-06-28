import { Router } from 'express';
import wkdController from '../../controller/wkdController/index.js';
import wksController from '../../controller/wksController/index.js';

const router = Router();

// WKD
// eslint-disable-next-line no-useless-escape
router.get('/\.well-known/openpgpkey/:domain/hu/:hash', wkdController.getPublicKey);
// eslint-disable-next-line no-useless-escape
router.get('/\.well-known/openpgpkey/:domain/submission-address', wkdController.getSubmissionAddress);

// WKS
router.get('/api/:token', wksController.publishKey);

// Keyserver
// to be continued...

// Default Page
router.get("*", (req, res) => {
    console.log(req);
    res.status(404).send("PAGE NOT FOUND");
});

export default router;