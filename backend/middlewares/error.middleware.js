// Middleware global para manejo de errores
const { logger } = require('../shared/logger/logger');
const { sendError } = require('../shared/response/responseHandler');

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = (statusCode === 500 && process.env.NODE_ENV === 'production')
    ? 'Ocurrió un error interno en el servidor'
    : err.message;

  // Registrar el error
  logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (statusCode === 500) {
    logger.error(err.stack);
  }

  return sendError(res, message, statusCode);
};

module.exports = errorMiddleware;
