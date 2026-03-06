const bcrypt = require('bcrypt');
const ValidationError = require('../../shared/errors/ValidationError');
const AppError = require('../../shared/errors/AppError');
const { logger } = require('../../shared/logger/logger');

class BootstrapService {
  /**
   * @param {BootstrapRepository} bootstrapRepository
   * @param {AuditService} auditService
   */
  constructor(bootstrapRepository, auditService) {
    this.bootstrapRepository = bootstrapRepository;
    this.auditService = auditService;
  }

  async getStatus() {
    const status = await this.bootstrapRepository.getSystemStatus();
    return { initialized: status === 'INICIALIZADO' };
  }

  async getInitializationData() {
    const status = await this.bootstrapRepository.getSystemStatus();
    if (status === 'INICIALIZADO') {
      throw new ValidationError('El sistema ya ha sido inicializado.');
    }

    const areas = await this.bootstrapRepository.getAreas();
    return { areas };
  }

  async initializeSystem(data) {
    const status = await this.bootstrapRepository.getSystemStatus();
    if (status === 'INICIALIZADO') {
      throw new ValidationError('El sistema ya ha sido inicializado.');
    }

    // Validaciones básicas
    const requiredFields = ['nombre', 'apellido', 'codigo_interno', 'password'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new ValidationError(`El campo ${field} es obligatorio.`);
      }
    }

    const adminRoleId = await this.bootstrapRepository.getAdminRoleId();
    if (!adminRoleId) {
      throw new AppError('Error de configuración: Rol Administrador no encontrado.', 500);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return await this.bootstrapRepository.withTransaction(async () => {
      // 1. Crear Administrador Inicial
      const { personaId, usuarioId } = await this.bootstrapRepository.createInitialAdmin(
        {
          nombre: data.nombre,
          apellido: data.apellido,
          codigo_interno: data.codigo_interno
        },
        {
          username: data.codigo_interno,
          password_hash: passwordHash,
          rol_id: adminRoleId
        }
      );

      // 2. Cambiar estado del sistema
      await this.bootstrapRepository.setSystemStatus('INICIALIZADO');

      // 3. Auditar bootstrap
      await this.auditService.logChange({
        usuario: 'SYSTEM_BOOTSTRAP',
        accion: 'SYSTEM_INITIALIZATION',
        entidad: 'Sistema',
        entidad_id: 1,
        valor_anterior: 'NO_INICIALIZADO',
        valor_nuevo: 'INICIALIZADO',
        motivo_cambio: 'Inicialización del sistema y creación del primer administrador real'
      });

      logger.info(`Sistema inicializado con éxito por ${data.codigo_interno}`);

      return { success: true };
    });
  }
}

module.exports = BootstrapService;