const { logger } = require('../logger/logger');

class AuditService {
  static CATEGORIAS = {
    ERROR_CAPTURA: 'ERROR_CAPTURA',
    AJUSTE_OPERATIVO: 'AJUSTE_OPERATIVO',
    REACTIVACION_AUTORIZADA: 'REACTIVACION_AUTORIZADA',
    DESACTIVACION_SEGURIDAD: 'DESACTIVACION_SEGURIDAD',
    CORRECCION_HISTORICA: 'CORRECCION_HISTORICA'
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

      // Clasificación automática inteligente si no se provee una
      if (!auditData.categoria_motivo) {
          if (auditData.accion === 'REACTIVACION_USUARIO') {
              auditData.categoria_motivo = AuditService.CATEGORIAS.REACTIVACION_AUTORIZADA;
          } else if (auditData.accion === 'OPERATIONAL_ASSIGNMENT' || auditData.accion === 'ROL_OPERATIVO_CHANGE') {
              auditData.categoria_motivo = AuditService.CATEGORIAS.AJUSTE_OPERATIVO;
          } else if (auditData.accion === 'STATUS_CHANGE' && (auditData.valor_nuevo?.estado === 'Suspendido' || auditData.valor_nuevo?.estado === 'Baja lógica')) {
              auditData.categoria_motivo = AuditService.CATEGORIAS.DESACTIVACION_SEGURIDAD;
          } else if (auditData.es_correccion) {
              auditData.categoria_motivo = AuditService.CATEGORIAS.CORRECCION_HISTORICA;
          }
      }

      // Validación estricta del catálogo cerrado
      if (auditData.categoria_motivo && !Object.values(AuditService.CATEGORIAS).includes(auditData.categoria_motivo)) {
          throw new Error(`Categoría de motivo inválida: ${auditData.categoria_motivo}`);
      }

      // El motivo y la categoría son obligatorios para acciones sensibles
      const accionesSensibles = ['STATUS_CHANGE', 'UPDATE', 'REACTIVACION_USUARIO', 'OPERATIONAL_ASSIGNMENT', 'ROLE_CHANGE'];
      if (accionesSensibles.includes(auditData.accion) || auditData.es_correccion) {
          if (!auditData.motivo_cambio || auditData.motivo_cambio.length < 5) {
              throw new Error('Debe proporcionar un motivo descriptivo para esta acción.');
          }
          if (!auditData.categoria_motivo) {
              throw new Error('Debe seleccionar una categoría de motivo válida.');
          }
      }

      if (auditData.es_correccion) {
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
}

module.exports = AuditService;
