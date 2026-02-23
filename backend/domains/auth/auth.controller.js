// Controlador para manejo de peticiones de autenticación
const { sendSuccess } = require('../../shared/response/responseHandler');
const { NODE_ENV } = require('../../config/env');

class AuthController {
  /**
   * @param {AuthService} authService
   */
  constructor(authService) {
    this.authService = authService;
  }

  login = async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const result = await this.authService.login(username, password);

      // Configurar cookie para protección de navegación en el navegador
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
      });

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      // req.user.usuario_id contiene el ID de la tabla usuarios
      await this.authService.changePassword(req.user.usuario_id, currentPassword, newPassword);
      return sendSuccess(res, null, 'Contraseña actualizada correctamente');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = AuthController;
