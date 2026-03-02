const { logger } = require('../logger/logger');

class AuditService {
  static CATEGORIAS = {
    ERROR_CAPTURA: 'ERROR_CAPTURA',
    AJUSTE_OPERATIVO: 'AJUSTE_OPERATIVO',
    REACTIVACION_AUTORIZADA: 'REACTIVACION_AUTORIZADA'
  };

  /**
   * @param {AuditRepository} auditRepository
   */
  constructor(auditRepository) {
    this.auditRepository = auditRepository;
  }

  async logChange(data) {
    try {
      const auditData = { ...data };

      // Clasificación automática basada en acción si no se provee una
      if (!auditData.categoria_motivo) {
          if (auditData.accion === 'REACTIVACION_USUARIO') {
              auditData.categoria_motivo = AuditService.CATEGORIAS.REACTIVACION_AUTORIZADA;
          } else if (auditData.accion === 'OPERATIONAL_ASSIGNMENT' || auditData.accion === 'ROL_OPERATIVO_CHANGE') {
              auditData.categoria_motivo = AuditService.CATEGORIAS.AJUSTE_OPERATIVO;
          } else if (auditData.es_correccion) {
              auditData.categoria_motivo = AuditService.CATEGORIAS.ERROR_CAPTURA;
          }
      } else {
          // Validar catálogo cerrado si se provee
          if (!Object.values(AuditService.CATEGORIAS).includes(auditData.categoria_motivo)) {
              logger.warn(`Categoría de motivo inválida detectada: ${auditData.categoria_motivo}. Se ignorará.`);
              auditData.categoria_motivo = null;
          }
      }

      if (auditData.es_correccion) {
          if (!auditData.motivo_cambio) {
              throw new Error('El motivo es obligatorio para registrar una corrección');
          }
          // Asegurar que no se duplique el prefijo si ya viene de capas superiores
          if (auditData.accion && !auditData.accion.startsWith('CORRECCION_')) {
              auditData.accion = `CORRECCION_${auditData.accion}`;
          }
          if (auditData.motivo_cambio && !auditData.motivo_cambio.startsWith('[CORRECCIÓN]')) {
              auditData.motivo_cambio = `[CORRECCIÓN] ${auditData.motivo_cambio}`;
          }
      }

      await this.auditRepository.create(auditData);
    } catch (error) {
      // No bloqueamos la operación principal si falla la auditoría, pero lo registramos
      logger.error('Error al registrar auditoría:', error.message);
      // Re-lanzamos el error si es un error de validación de negocio (motivo/categoría)
      if (error.message.includes('motivo') || error.message.includes('categoría')) {
          throw error;
      }
    }
  }

  async logStatusChange(usuario, entidad, id, anterior, nuevo, motivo, categoria = null) {
    return await this.logChange({
      usuario,
      accion: 'STATUS_CHANGE',
      entidad,
      entidad_id: id,
      valor_anterior: { estado: anterior },
      valor_nuevo: { estado: nuevo },
      motivo_cambio: motivo,
      categoria_motivo: categoria
    });
  }

  async logUpdate(usuario, entidad, id, anterior, nuevo, motivo, categoria = null) {
      return await this.logChange({
          usuario,
          accion: 'UPDATE',
          entidad,
          entidad_id: id,
          valor_anterior: anterior,
          valor_nuevo: nuevo,
          motivo_cambio: motivo,
          categoria_motivo: categoria
      });
  }

  async getAll(filtros = {}) {
    return await this.auditRepository.findAll(filtros);
  }
}

module.exports = AuditService;
