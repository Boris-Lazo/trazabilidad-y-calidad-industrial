// Servicio para lógica de negocio de autenticación
const bcrypt = require('bcrypt');
const UnauthorizedError = require('../../shared/errors/UnauthorizedError');
const { logger } = require('../../shared/logger/logger');

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
    // 0. Verificar estado del sistema
    const status = await this.authRepository.getSystemStatus();
    if (status !== 'INICIALIZADO') {
        throw new UnauthorizedError('El sistema requiere inicialización antes de permitir el acceso.');
    }

    // Simular un tiempo de procesamiento uniforme para evitar enumeración de usuarios
    const start = Date.now();

    const user = await this.authRepository.findByUsername(username);

    if (user) {
        if (user.persona_id) {
            const persona = await this.authRepository.getPersonaById(user.persona_id);
            if (persona && persona.estado_laboral === 'Baja') {
                throw new UnauthorizedError('Acceso denegado: cuenta dada de baja.');
            }
            if (persona && ['Incapacitado', 'Inactivo'].includes(persona.estado_laboral)) {
                throw new UnauthorizedError('Acceso denegado: colaborador con ausencia activa.');
            }
        } else if (user.estado_usuario !== 'Activo') {
            // Verificación legacy para admin técnico sin persona_id
            throw new UnauthorizedError(`Acceso denegado: Cuenta en estado ${user.estado_usuario}`);
        }

        if (user.bloqueado_at) {
            // Podríamos implementar lógica de desbloqueo por tiempo aquí si fuera necesario
            throw new UnauthorizedError('Cuenta bloqueada por seguridad. Contacte al administrador.');
        }
    }

    // Siempre verificamos el hash incluso si el usuario no existe para mantener tiempo uniforme
    const passwordToCompare = user ? user.password_hash : (DUMMY_HASH || '$2b$10$S9pYV79.ZNo5.M3Svh6A.eA9.mO8.uP8.aO8.uP8.aO8.uP8.aO8.u');
    const isMatch = await bcrypt.compare(password, passwordToCompare);

    // Asegurar que la operación tome al menos 300ms
    const elapsed = Date.now() - start;
    if (elapsed < 300) {
      await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
    }

    if (!user || !isMatch) {
      if (user) {
          const newAttempts = (user.intentos_fallidos || 0) + 1;
          let blockedAt = null;
          if (newAttempts >= 5) {
              blockedAt = new Date().toISOString();
          }
          await this.authRepository.updateLoginAttempts(user.id, newAttempts, blockedAt);
      }
      // Mensaje genérico por seguridad
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Login exitoso, resetear intentos
    await this.authRepository.resetLoginAttempts(user.id);

    const payload = {
      id: user.persona_id, // Null para usuario técnico admin
      usuario_id: user.id,
      username: user.username,
      rol: user.rol,
      nombre: user.persona_id ? `${user.nombre} ${user.apellido}` : 'Administrador de Sistema',
      must_change_password: !!user.must_change_password
    };

    const token = this.tokenService.generateAccessToken(payload);

    return {
      token,
      user: payload
    };
  }

  async changePassword(usuarioId, currentPassword, newPassword) {
    const user = await this.authRepository.findById(usuarioId);
    if (!user) throw new UnauthorizedError('Usuario no encontrado');

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) throw new UnauthorizedError('La contraseña actual es incorrecta');

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.authRepository.updatePassword(usuarioId, hashedNewPassword);

    return true;
  }
}

module.exports = AuthService;
