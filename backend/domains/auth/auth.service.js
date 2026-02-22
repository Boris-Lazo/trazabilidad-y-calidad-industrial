// Servicio para lógica de negocio de autenticación
const bcrypt = require('bcrypt');
const UnauthorizedError = require('../../shared/errors/UnauthorizedError');

// Hash ficticio para protección contra timing attacks pre-calculado al inicio
let DUMMY_HASH;
bcrypt.hash('dummy-placeholder', 10).then(hash => {
    DUMMY_HASH = hash;
});

class AuthService {
  /**
   * @param {AuthRepository} authRepository
   * @param {TokenService} tokenService
   */
  constructor(authRepository, tokenService) {
    this.authRepository = authRepository;
    this.tokenService = tokenService;
  }

  async login(username, password) {
    // Simular un tiempo de procesamiento uniforme para evitar enumeración de usuarios
    const start = Date.now();

    const user = await this.authRepository.findByUsername(username);

    // Siempre verificamos el hash incluso si el usuario no existe para mantener tiempo uniforme
    const passwordToCompare = user ? user.password : (DUMMY_HASH || '$2b$10$S9pYV79.ZNo5.M3Svh6A.eA9.mO8.uP8.aO8.uP8.aO8.uP8.aO8.u');
    const isMatch = await bcrypt.compare(password, passwordToCompare);

    // Asegurar que la operación tome al menos 300ms
    const elapsed = Date.now() - start;
    if (elapsed < 300) {
      await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
    }

    if (!user || !isMatch) {
      // Mensaje genérico por seguridad
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const payload = {
      id: user.id,
      username: user.username,
      rol: user.rol,
      nombre: user.nombre
    };

    const token = this.tokenService.generateAccessToken(payload);

    return {
      token,
      user: payload
    };
  }
}

module.exports = AuthService;
