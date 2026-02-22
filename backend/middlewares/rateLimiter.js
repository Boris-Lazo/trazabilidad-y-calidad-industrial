const rateLimit = require('express-rate-limit');

/**
 * Limitador específico para el endpoint de login
 * Máximo 5 intentos cada 15 minutos por IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Límite de 5 intentos
  message: {
    success: false,
    data: null,
    error: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter };
