// Middleware global para manejo de errores
const logger = require('../shared/logger/logger');

const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Registrar el error
  logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.statusCode === 500) {
    logger.error(err.stack);
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message || 'Ocurrió un error interno en el servidor'
  });
};

module.exports = errorMiddleware;
