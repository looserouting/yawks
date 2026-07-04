
import config from './src/config.js';
import { logger } from './src/service/logger.js';
import { ensureSubmissionKey, ensureCorporateRevocationKey } from './src/service/keyService.js';
import httpsServer from './src/service/httpsServer/index.js';

async function start() {
    logger.info('Starting YAWKS Corporate Edition...');

    try {
        // 1. Ensure submission key is present for signing outgoing mails
        await ensureSubmissionKey();

        // 2. Load corporate revocation key (for verifying revocation certificates)
        await ensureCorporateRevocationKey();

        // 3. Start the HTTPS Server (Dashboard & WKD/WKS API)
        const port = process.env.PORT || 3000;
        httpsServer.listen(port, () => {
            logger.info(`HTTPS server started on port ${port}`);
            logger.info(`Admin Dashboard: http://localhost:${port}/?admin=true`);
        }).on('error', (err) => {
            logger.error(`Error starting HTTPS server: ${err.message}`);
            process.exit(1);
        });

    } catch (err) {
        logger.error(`Critical startup error: ${err.message}`);
        process.exit(1);
    }
}

start();
