const AppError = require('./AppError');

class ForbiddenError extends AppError {
  constructor(message) {
    super(message || 'No tiene permisos para realizar esta acción', 403);
  }
}

module.exports = ForbiddenError;
