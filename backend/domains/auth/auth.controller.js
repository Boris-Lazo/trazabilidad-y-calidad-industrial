// Controlador para manejo de peticiones de autenticación
const authService = require('./auth.service');
const { NODE_ENV } = require('../../config/env');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    // Configurar cookie para protección de navegación en el navegador
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login
};
