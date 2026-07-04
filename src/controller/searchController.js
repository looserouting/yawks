
import { Keys } from '../model/index.js';
import { Op } from 'sequelize';
import { logger } from '../service/logger.js';

async function searchKeys(req, res) {
    const raw = req.query.q;
    const q = Array.isArray(raw) ? raw[0] : raw;

    if (!q || q.length < 3) {
        return res.status(400).send("Search query must be at least 3 characters long");
    }

    try {
        const keys = await Keys.findAll({
            where: {
                [Op.or]: [
                    { email: { [Op.like]: `%${q}%` } },
                    { fingerprint: { [Op.like]: `%${q}%` } }
                ],
                status: 'published'
            },
            attributes: ['email', 'fingerprint', 'keycreationtime', 'domain', 'wkdHash'],
            limit: 10
        });

        return res.status(200).json(keys);
    } catch (err) {
        logger.error(`Search error: ${err.message}`);
        return res.status(500).send("Error performing search");
    }
}

export default {
    searchKeys
};
