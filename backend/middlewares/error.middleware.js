// Middleware global para manejo de errores
const { logger } = require('../shared/logger/logger');
const { sendError } = require('../shared/response/responseHandler');

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = (statusCode === 500 && process.env.NODE_ENV === 'production')
    ? 'Ocurrió un error interno en el servidor'
    : err.message;

  // Registrar el error según severidad
  if (statusCode >= 500) {
      logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
      logger.error(err.stack);
  } else if (statusCode === 403) {
      // Objetivo 1: No registrar como error del sistema intentos de usuarios desactivados
      logger.info(`Acceso Denegado (403): ${err.message} - ${req.originalUrl} - ${req.ip}`);
  } else {
      logger.warn(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  return sendError(res, message, statusCode);
};

module.exports = errorMiddleware;
