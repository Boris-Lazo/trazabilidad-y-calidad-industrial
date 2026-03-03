const AppError = require('./AppError');

/**
 * Error para violaciones de reglas de negocio (Entidad no procesable).
 * Se usa para errores que no deben provocar el cierre de sesión.
 */
class DomainError extends AppError {
  constructor(message) {
    super(message || 'Error de regla de negocio', 422);
  }
}

module.exports = DomainError;
