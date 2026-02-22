// Middleware para autenticación mediante JWT
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const AppError = require('../shared/errors/AppError');

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
        return next(new AppError('No estás autenticado. Por favor, inicia sesión.', 401));
    } else {
        return res.redirect('/login.html');
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (req.originalUrl.startsWith('/api/')) {
        return next(new AppError('Token inválido o expirado.', 401));
    } else {
        return res.redirect('/login.html');
    }
  }
};

module.exports = authMiddleware;
