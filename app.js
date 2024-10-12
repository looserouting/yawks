import express from 'express';
import mailServer from './src/smtpServer.js'
import httpsServer from './src/httpsServer.js';
import setupRoutes from './src/routes.js'; // Import the routes
import { initializeApp } from './src/init.js';

// Call the initializeApp function to perform initial checks and setup
await initializeApp();

mailServer.listen(25, () => console.log('SMTP server started'));

const app = express();
httpsServer.listen(443, () => console.log('HTTPS server started'));
setupRoutes(app); // Set up the routes
