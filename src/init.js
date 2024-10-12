import fs from 'node:fs';
import path from 'path';
import config from '../config.js';
import { exit } from 'node:process';


async function checkFilesExist() {
    const filesToCheck = [
        config.ServerDefaultKey,
        config.ServerDefaultCert,
        config.pgpprivkey,
        config.pgppubkey,
        ...Object.values(config.domains).flatMap(domain => [domain.cert, domain.key])
    ];

    const missingFiles = filesToCheck.filter(filePath => filePath && !fs.existsSync(filePath));

    if (missingFiles.length > 0) {
        console.log('The following files are missing:', missingFiles);
        return false;
    }

    console.log('All files exist.');
    return true;
}

function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    } catch (error) {
        console.error(`Error creating directory: ${error}`);
    }
}

function ensureFileExists(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '');
        }
    } catch (error) {
        console.error(`Error creating file: ${error}`);
    }
}

function setupDirectories() {
    const datadir = config.datadir;
    const requestsDir = path.join(datadir, 'requests');
    ensureDirectoryExists(requestsDir);

    for (const domain in config.domains) {
        const domainDir = path.join(datadir, domain);
        const huDir = path.join(domainDir, 'hu');
        const pendingDir = path.join(domainDir, 'pending');
        const policyFile = path.join(domainDir, 'policy');

        ensureDirectoryExists(domainDir);
        ensureDirectoryExists(huDir);
        ensureDirectoryExists(pendingDir);
        ensureFileExists(policyFile);
    }
}

export async function initializeApp() {
    // Check if certs and keys exist
    if (!(await checkFilesExist())) {
        console.log('check your config');
        exit();
    }

    // Call the function to set up directories
    setupDirectories();
}