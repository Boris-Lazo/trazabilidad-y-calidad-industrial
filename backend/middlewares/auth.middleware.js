// Middleware para autenticación mediante JWT
const tokenService = require('../shared/security/token.service');
const UnauthorizedError = require('../shared/errors/UnauthorizedError');
const ForbiddenError = require('../shared/errors/ForbiddenError');

const sqlite = require('../database/sqlite');

const authMiddleware = async (req, res, next) => {
  if (process.env.DISABLE_AUTH_CHECKS === 'true') {
    req.user = { id: 1, usuario_id: 1, username: 'admin', rol: 'Administrador' };
    return next();
  }
  // Intentar obtener el token de la cabecera Authorization o de la cookie
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    // Si no es una llamada a la API, podríamos querer redirigir al login
    if (req.originalUrl.startsWith('/api/')) {
        return next(new UnauthorizedError('No estás autenticado. Por favor, inicia sesión.'));
    } else {
        return res.redirect('/login.html');
    }
  }

  try {
    const decoded = tokenService.verifyAccessToken(token);

    // Verificación inmediata de estado de usuario en DB para cumplir con "cierre de sesión inmediato"
    const user = await sqlite.get('SELECT estado_usuario FROM usuarios WHERE id = ?', [decoded.usuario_id]);

    if (!user || user.estado_usuario !== 'Activo') {
        if (req.originalUrl.startsWith('/api/')) {
            return next(new ForbiddenError('Su cuenta ha sido desactivada o bloqueada. Acceso denegado.'));
        } else {
            return res.redirect('/login.html?error=account_disabled');
        }
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (req.originalUrl.startsWith('/api/')) {
        return next(new UnauthorizedError('Token inválido o expirado.'));
    } else {
        return res.redirect('/login.html');
    }
  }
};

module.exports = authMiddleware;
