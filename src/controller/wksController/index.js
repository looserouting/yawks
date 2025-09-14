import { sequelize } from '../../model/index.js';

// Function to handle key validation
async function publishKey(req, res) {
    const { token } = req.params;
    // TODO store request in Database (sequelize->Requests)

    console.log("Validation completion initiated.");
    console.log(`Processing token: ${token}`);

    try {
        // Step 1: Find token in Requests table
        const request = await sequelize.models.Request.findOne({ where: { token } });
        if (!request) {
            return res.status(404).send("Token not found in Requests");
        }

        // Step 2: Check if request is still pending
        if (request.status !== 'pending') {
            return res.status(400).send("Request is not pending and cannot be activated");
        }

        // Step 3: Activate the key (set status to 'published')
        const key = await sequelize.models.Key.findOne({ where: { id: request.requested_key_id } });
        if (!key) {
            return res.status(404).send("Key not found for this request");
        }

        await key.update({ status: 'published' });

        // Step 4: Set activation_date in KeyVersions
        await sequelize.models.KeyVersions.update(
            { activation_date: new Date(), status: 'active' },
            { where: { key_id: key.id } }
        );

        // Step 5: Set request status to 'approved'
        await request.update({ status: 'approved', processed_at: new Date() });

        // Send success response
        return res.status(200).send("Key has been activated, KeyVersion updated, and request approved");

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