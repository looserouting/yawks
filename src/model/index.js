import { Sequelize } from 'sequelize';
import definePendingRequest from './pendingRequest.js';
import defineKey from './key.js';
import defineWkd from './wkd.js';
import defineWks from './wks.js';
import 'dotenv/config';


// Initialize Sequelize (you can replace the SQLite connection with your actual database)
export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    storage: process.env.DB_STORAGE,
  });

  // TODO check if Database exists. if not create database and import Data from file
try {
  await sequelize.authenticate();
  console.log('Connection has been established successfully.');
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

// Initialize models
export const Wks = defineWks(sequelize);
export const Wkd = defineWkd(sequelize);
export const Key = defineKey(sequelize);

const pendingRequest = definePendingRequest(sequelize);
pendingRequest.belongsTo(Key, {
  foreignKey: 'email',  // Foreign key column in pendingRequest
  //as: 'key'             // Alias for the relationship
});
export {pendingRequest};



// Export models and sequelize connection
export default { pendingRequest, Key , Wks, Wkd};