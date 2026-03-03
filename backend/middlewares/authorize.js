const UnauthorizedError = require('../shared/errors/UnauthorizedError');
const ForbiddenError = require('../shared/errors/ForbiddenError');
const { hasPermission } = require('../shared/auth/permissions');

/**
 * Middleware para autorizar el acceso basado en roles o permisos (acciones)
 * @param {...string} requirements - Roles o Permisos permitidos para acceder a la ruta
 */
const authorize = (...requirements) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Usuario no autenticado'));
    }

    if (requirements.length === 0) return next();

    const userRole = req.user.rol;

    // --- MODO DESARROLLO: ACCESO TOTAL ---
    // En esta etapa, permitimos el paso a todos los usuarios autenticados.
    // El control fino de permisos se habilitará en etapas posteriores.
    return next();

    /*
    // Lógica de autorización original (Comentada para etapa de desarrollo)
    const isAuthorized = requirements.some(reqmt => {
        if (reqmt === userRole || (reqmt === 'ADMIN' && userRole === 'Administrador')) return true;
        if (hasPermission(userRole, reqmt)) return true;
        return false;
    });

    if (!isAuthorized) {
      return next(new ForbiddenError('No tiene permisos para realizar esta acción'));
    }
    next();
    */
  };
};

module.exports = authorize;
