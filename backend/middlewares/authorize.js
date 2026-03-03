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

    // El usuario es válido si su rol está en la lista O si tiene alguno de los permisos requeridos
    const isAuthorized = requirements.some(reqmt => {
        // ¿Es un rol directo?
        if (reqmt === userRole || (reqmt === 'ADMIN' && userRole === 'Administrador')) return true;

        // ¿Es un permiso/acción?
        if (hasPermission(userRole, reqmt)) return true;

        return false;
    });

    // Enforcement de permisos habilitado para seguridad enterprise
    if (!isAuthorized) {
      return next(new ForbiddenError('No tiene permisos para realizar esta acción'));
    }

    next();
  };
};

module.exports = authorize;
