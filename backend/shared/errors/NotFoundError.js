const AppError = require('./AppError');

class NotFoundError extends AppError {
  constructor(message) {
    super(message || 'El recurso solicitado no existe', 404);
  }
}

module.exports = NotFoundError;
