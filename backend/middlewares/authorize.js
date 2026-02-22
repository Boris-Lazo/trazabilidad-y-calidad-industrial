const UnauthorizedError = require('../shared/errors/UnauthorizedError');

/**
 * Middleware para autorizar el acceso basado en roles
 * @param {...string} allowedRoles - Roles permitidos para acceder a la ruta
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Usuario no autenticado'));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.rol)) {
      return next(new UnauthorizedError('No tiene permisos para realizar esta acción'));
    }

    next();
  };
};

module.exports = authorize;
