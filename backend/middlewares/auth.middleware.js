// Middleware para autenticación mediante JWT
const tokenService = require('../shared/security/token.service');
const UnauthorizedError = require('../shared/errors/UnauthorizedError');

const authMiddleware = (req, res, next) => {
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
