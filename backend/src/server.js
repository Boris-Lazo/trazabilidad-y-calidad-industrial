// Punto de entrada del servidor
const app = require('./app');
const { PORT, NODE_ENV } = require('../config/env');
const { initDB } = require('../database/sqlite');
const logger = require('../shared/logger/logger');

// Inicializar base de datos
try {
  initDB();
} catch (err) {
  logger.error('Error fatal al inicializar la base de datos:', err);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  logger.info(`Servidor industrial corriendo en el puerto ${PORT} [Mode: ${NODE_ENV}]`);
});

// Manejo de cierres limpios
process.on('SIGTERM', () => {
  logger.info('Cierre SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado.');
    process.exit(0);
  });
});
