// Middleware para validación de esquemas usando Zod
const AppError = require('../shared/errors/AppError');

const validate = (schema) => (req, res, next) => {
  try {
    // Validar body, params y query si existen en el esquema
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    next();
  } catch (error) {
    const message = error.errors ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') : error.message;
    next(new AppError(message, 400));
  }
};

module.exports = validate;
