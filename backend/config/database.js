// Configuración de la ruta de la base de datos
const path = require('path');
const { DB_SOURCE } = require('./env');

module.exports = {
  // Asegurar que la ruta sea absoluta y esté dentro de backend/database/
  dbPath: path.resolve(__dirname, '../database', DB_SOURCE)
};
