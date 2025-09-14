import { Sequelize } from 'sequelize';
import config from '../config.js';
import defineKey from './keys.js';
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

export const sequelize = new Sequelize(config.database_uri);

// Initialize models
defineKey(sequelize);

await initializeDatabase();

// sequelize
export default sequelize;