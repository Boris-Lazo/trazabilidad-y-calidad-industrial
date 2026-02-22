// Servicio para gestión de tokens JWT
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env');

/**
 * Genera un token de acceso para un usuario
 * @param {Object} payload - Datos del usuario a incluir en el token
 * @returns {string} Token JWT
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '8h'
  });
};

/**
 * Verifica un token de acceso
 * @param {string} token - Token JWT a verificar
 * @returns {Object} Payload decodificado
 * @throws {Error} Si el token es inválido o ha expirado
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateAccessToken,
  verifyAccessToken
};
