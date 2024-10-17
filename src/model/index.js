import { Sequelize } from 'sequelize';
import fs from 'node:fs';
import definePendingRequest from './pendingRequest.js';
import defineKey from './key.js';
import defineWkd from './wkd.js';
import defineWks from './wks.js';
import process from 'process';
import 'dotenv/config';

// Funktion zum Initialisieren der Datenbank
async function initializeDatabase() {
  try {
      // Synchronisieren der Modelle mit der Datenbank (Tabellen erstellen, falls nicht vorhanden)
      await sequelize.authenticate();  // Verbindungsprüfung
      console.log('Verbindung erfolgreich hergestellt.');
      
      await sequelize.sync({ force: false });  // Erstellt Tabellen, falls sie nicht existieren
      console.log('Tabellen erfolgreich erstellt oder synchronisiert.');

      // Prüfen, ob die Tabelle "Wks" leer ist
      const WksCount = await sequelize.models.Wks.count();
      if (WksCount === 0) {
          console.log('Fülle Datenbank mit Initialdaten...');

          // JSON-Datei einlesen
          const data = fs.readFileSync('initdb.json', 'utf8');
          const jsonData = JSON.parse(data);

          // Daten in die Datenbank einfügen
          await sequelize.models.Wks.bulkCreate(jsonData.Wks);
          await sequelize.models.Wkd.bulkCreate(jsonData.Wkd);
          await sequelize.models.Key.bulkCreate(jsonData.key);

          console.log('Initialdaten erfolgreich eingefügt.');
      } else {
          console.log('Datenbank enthält bereits Daten.');
      }
  } catch (err) {
      console.error('Fehler beim Initialisieren der Datenbank:', err);
      process.exit;
  }
}

// Initialize Sequelize (you can replace the SQLite connection with your actual database)
export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    storage: process.env.DB_STORAGE,
  }
);


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