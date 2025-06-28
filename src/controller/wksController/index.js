// wksController.js
import fs from 'node:fs';
import config from '../../config.js';
import { sequelize } from '../../model/index.js';

// Function to handle key validation
async function publishKey(req, res) {
    const { token } = req.params;
    // TODO store request in Database (sequelize->pendingRequests)
    const tokenFilePath = `${config.directory}/requests/${token}`;

    console.log("Validation completion initiated.");
    console.log(`Processing token: ${token}`);

    try {
        // Step 1: Find token in pendingRequests table
        const request = await sequelize.models.key.findOne({ where: { token } });
        if (!request) {
            return res.status(404).send("Hash not found in pendingRequests");
        }

        // Step 2: Insert into Database -> Keys Table
        await sequelize.models.Key.create({
            email: request.email, // Stelle sicher, dass parsedData.email existiert
            wkdHash: request.token,
            domain: request.domain,
            key: keyContent,
            status: 'published'
        });

        // Step 3: Remove token file after processing
        // TODO delete requestPending
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
    publishKey
}