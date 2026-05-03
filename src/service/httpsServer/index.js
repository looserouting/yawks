// httpsServer.js
import express from 'express';
import http from 'http';
import routes from './routes.js';

const app = express();
app.use(routes);

const httpService = http.createServer(app);

export default httpService;
