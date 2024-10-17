// wksController.js
import fs from 'node:fs';
import path from 'path';

// Function to check submited key and send verification mail
// This is called within the stmp service
function submitVerificationMail(req, res) {
    // TODO Insert Code here
};

// Function to handle key validation
async function publishKey(req, res) {
    const { token } = req.params;
    const tokenFilePath = `${config.datadir}/requests/${token}`;

    console.log("Validation completion initiated.");
    console.log(`Processing token: ${token}`);

    try {
        // Step 1: Read token file
        const data = await fs.promises.readFile(tokenFilePath, 'utf8');
        const parsedData = JSON.parse(data);

        const { domain, wdkHash } = parsedData;
        const sourcePath = path.join(config.datadir, domain, 'pending', wdkHash);
        const destinationPath = path.join(config.datadir, domain, 'hu', wdkHash);

        // Step 2: Move file from 'pending' to 'hu'
        await fs.promises.rename(sourcePath, destinationPath);
        console.log(`Key successfully moved from ${sourcePath} to ${destinationPath}`);

        // Step 3: Remove token file after processing
        await fs.promises.unlink(tokenFilePath);
        console.log(`Token file removed: ${tokenFilePath}`);

        // Send success response
        return res.status(200).send("Key has been saved on the server");

    } catch (err) {
        // Handle different error types more specifically
        if (err.code === 'ENOENT') {
            console.error(`File not found: ${err.path}`);
            return res.status(404).send("Requested file not found");
        } else {
            console.error(`Error processing request: ${err.message}`);
            return res.status(500).send("Error processing request");
        }
    }
};

export default {
    publishKey,
    submitVerificationMail
}