import { Sequelize } from 'sequelize';
import config from '../config.js';
import definePendingRequest from './pendingRequest.js';
import defineKey from './key.js';
import defineWkd from './wkd.js';
import defineWks from './wks.js';
import process from 'process';

// Funktion zum Initialisieren der Datenbank
async function initializeDatabase() {
  try {
      // Synchronisieren der Modelle mit der Datenbank (Tabellen erstellen, falls nicht vorhanden)
      await sequelize.authenticate();  // Verbindungsprüfung
      console.log('Verbindung erfolgreich hergestellt.');
      
      await sequelize.sync({ force: false });  // Erstellt Tabellen, falls sie nicht existieren
      console.log('Tabellen erfolgreich erstellt oder synchronisiert.');
    
  } catch (err) {
      console.error('Fehler beim Initialisieren der Datenbank:', err);
      process.exit();
  }
}

// Initialize Sequelize (you can replace the SQLite connection with your actual database)
export const sequelize = new Sequelize(config.database_uri);

// Initialize models
defineWks(sequelize);
defineWkd(sequelize);
const Key = defineKey(sequelize);

const pendingRequest = definePendingRequest(sequelize);
pendingRequest.belongsTo(Key, {
  foreignKey: 'email',  // Foreign key column in pendingRequest
  as: 'key'             // Alias for the relationship
});

await initializeDatabase();

// sequelize
export default sequelize;