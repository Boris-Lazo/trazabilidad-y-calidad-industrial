const AppError = require('./AppError');

class ValidationError extends AppError {
  constructor(message) {
    super(message || 'Error de validación de datos', 400);
  }
}

module.exports = ValidationError;
