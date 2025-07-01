import { Sequelize } from 'sequelize';
import config from '../config.js';
import defineKey from './keys.js';
import defineKeyVersions from './keyVersions.js';
import defineEmailAddresses from './EmailAddresses.js';
import defineRequest from './request.js';
import process from 'process';

// Initialize Sequelize (you can replace the SQLite connection with your actual database)
export const sequelize = new Sequelize(config.database_uri);

// Initialize models
const EmailAddresses = defineEmailAddresses(sequelize);
const Key = defineKey(sequelize);
const KeyVersions = defineKeyVersions(sequelize);
const Request = defineRequest(sequelize);

// Define relationships
Key.belongsTo(EmailAddresses, {
  foreignKey: 'email',
  as: 'emailAddress'
});

KeyVersions.belongsTo(Key, {
  foreignKey: 'key_id',
  as: 'key'
});

Request.belongsTo(Key, {
  foreignKey: 'requested_key_id',
  as: 'requestedKey'
});

Request.belongsTo(EmailAddresses, {
  foreignKey: 'email',
  as: 'requesterEmail'
});


// Function to initialize the database
async function initializeDatabase() {
  try {
    // Authenticate and sync models with the database
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    await sequelize.sync({ force: false });
    console.log('Tables created or synchronized successfully.');
  } catch (err) {
    console.error('Error initializing the database:', err);
    process.exit();
  }
}

await initializeDatabase();

// Export sequelize
export default sequelize;