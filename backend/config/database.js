// Configuración de la ruta de la base de datos SQLite
const path = require('path');
const { DB_SOURCE, ADMIN_PASSWORD } = require('./env');

module.exports = {
  // Ruta absoluta a la base de datos dentro de backend/src/database/
  dbPath: path.resolve(__dirname, '../database', DB_SOURCE),
  adminPassword: ADMIN_PASSWORD
};
