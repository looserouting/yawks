import { Sequelize } from 'sequelize';
import definePendingRequest from './pendingRequest.js';
import defineKey from './key.js';
import defineConfig from './config.js';
import defineDomain from './domain.js'

// Initialize Sequelize (you can replace the SQLite connection with your actual database)
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',  // This sets up an in-memory SQLite database
  });
  
// Initialize models
const Domain = defineDomain(sequelize);
const Key = defineKey(sequelize);
const pendingRequest = definePendingRequest(sequelize);
const Config = defineConfig(sequelize);

// Setup associations
pendingRequest.belongsTo(Key, {
  foreignKey: 'email',  // Foreign key column in pendingRequest
  //as: 'key'             // Alias for the relationship
});

// Export models and sequelize connection
export { sequelize, pendingRequest, Key , Config, Domain};