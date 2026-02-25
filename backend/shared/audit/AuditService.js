const { logger } = require('../logger/logger');

class AuditService {
  /**
   * @param {AuditRepository} auditRepository
   */
  constructor(auditRepository) {
    this.auditRepository = auditRepository;
  }

  async logChange(data) {
    try {
      if (data.es_correccion) {
          data.accion = `CORRECCION_${data.accion}`;
          data.motivo_cambio = `[CORRECCIÓN] ${data.motivo_cambio}`;
      }
      await this.auditRepository.create(data);
    } catch (error) {
      // No bloqueamos la operación principal si falla la auditoría, pero lo registramos
      logger.error('Error al registrar auditoría:', error);
    }
  }

  async logStatusChange(usuario, entidad, id, anterior, nuevo, motivo) {
    return await this.logChange({
      usuario,
      accion: 'STATUS_CHANGE',
      entidad,
      entidad_id: id,
      valor_anterior: { estado: anterior },
      valor_nuevo: { estado: nuevo },
      motivo_cambio: motivo
    });
  }

  async logUpdate(usuario, entidad, id, anterior, nuevo, motivo) {
      return await this.logChange({
          usuario,
          accion: 'UPDATE',
          entidad,
          entidad_id: id,
          valor_anterior: anterior,
          valor_nuevo: nuevo,
          motivo_cambio: motivo
      });
  }
}

module.exports = AuditService;
