import { Sequelize } from 'sequelize';
import config from '../config.js';
import defineKeys from './keys.js';
import process from 'process';

// Initialize Sequelize
export const sequelize = new Sequelize(config.database_uri);

// Initialize models
defineKeys(sequelize);

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