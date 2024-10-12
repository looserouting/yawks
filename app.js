import express from 'express';
import mailServer from './src/service/smtpServer'
import httpsServer from './src/service/httpsServer';
import routes from './src/service/smtpServer/routes.js'; 
import { initializeApp } from './src/init.js';

// Call the initializeApp function to perform initial checks and setup
await initializeApp();

mailServer.listen(25, () => console.log('SMTP server started'));

const app = express();
app.use(routes)
httpsServer.listen(443, () => console.log('HTTPS server started'));