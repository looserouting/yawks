import express from 'express';
import smtpServer from './src/service/smtpServer/index.js'
import httpsServer from './src/service/httpsServer/index.js';
import routes from './src/service/httpsServer/routes.js'; 

smtpServer.listen(25, () => console.log('SMTP server started'));

const app = express();
app.use(routes)
httpsServer.listen(443, () => console.log('HTTPS server started'));