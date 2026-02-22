const AppError = require('./AppError');

class DatabaseError extends AppError {
  constructor(message) {
    // Nunca exponemos detalles técnicos de la DB al cliente
    super(message || 'Error interno en el procesamiento de datos', 500);
  }
}

module.exports = DatabaseError;
