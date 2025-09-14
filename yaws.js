import smtpServer from './src/service/smtpServer/index.js'
import httpsServer from './src/service/httpsServer/index.js';

smtpServer.listen(25, () => console.log('SMTP server started'));
httpsServer.listen(443, () => console.log('HTTPS server started'));