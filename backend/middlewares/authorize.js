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

    // ─── MODO DESARROLLO ───────────────────────────────────────────────
    // DISABLE_AUTH_CHECKS=true en .env habilita acceso total.
    // Cambiar a false (o eliminar la variable) para activar los candados
    // cuando el sistema esté listo para producción.
    if (process.env.DISABLE_AUTH_CHECKS === 'true') {
      return next();
    }

    // ─── LÓGICA DE PERMISOS (activa cuando DISABLE_AUTH_CHECKS != true) ─
    const userRole = req.user.rol;

    const isAuthorized = requirements.some(reqmt => {
      if (reqmt === userRole) return true;
      if (reqmt === 'ADMIN' && userRole === 'Administrador') return true;
      if (hasPermission(userRole, reqmt)) return true;
      return false;
    });

    if (!isAuthorized) {
      return next(new ForbiddenError('No tiene permisos para realizar esta acción'));
    }

    next();
  };
};

module.exports = authorize;
