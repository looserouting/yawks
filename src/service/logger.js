
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'yawks.log');

function log(level, message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    // Console output for dev
    console.log(formattedMessage.trim());
    
    // File output
    fs.appendFileSync(logFile, formattedMessage);
}

export const logger = {
    info: (msg) => log('INFO', msg),
    error: (msg) => log('ERROR', msg),
    warn: (msg) => log('WARN', msg),
    debug: (msg) => log('DEBUG', msg)
};
