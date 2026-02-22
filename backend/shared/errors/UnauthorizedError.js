const AppError = require('./AppError');

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message || 'No autorizado para realizar esta acción', 401);
  }
}

module.exports = UnauthorizedError;
