// Servicio para órdenes de producción
class OrdenProduccionService {
  /**
   * @param {OrdenProduccionRepository} ordenProduccionRepository
   * @param {AuditService} auditService
   */
  constructor(ordenProduccionRepository, auditService) {
    this.ordenProduccionRepository = ordenProduccionRepository;
    this.auditService = auditService;
  }

  async getAll(filters = {}) {
    return await this.ordenProduccionRepository.findAll(filters);
  }

  async getById(id) {
    return await this.ordenProduccionRepository.findById(id);
  }

  async create(data) {
    // Validar prefijo del código de orden (7 dígitos ya validados por Zod)
    const prefix = parseInt(data.codigo_orden[0]);
    if (prefix < 1 || prefix > 9) {
        throw new Error('El primer dígito de la orden debe estar entre 1 y 9.');
    }

    const id = await this.ordenProduccionRepository.create({
        ...data,
        estado: 'Creada'
    });
    return await this.ordenProduccionRepository.findById(id);
  }

  async update(id, data, usuario = 'SISTEMA') {
    const existing = await this.ordenProduccionRepository.findById(id);
    if (!existing) throw new Error('Orden no encontrada');

    // Si la orden está liberada o en producción, solo permitir cambios de estado o motivo_cierre
    const restrictedStates = ['Liberada', 'En producción', 'Pausada', 'Cerrada', 'Cancelada'];
    if (restrictedStates.includes(existing.estado)) {
        const allowedKeys = ['estado', 'motivo_cierre'];
        const keys = Object.keys(data);
        const hasRestrictedChanges = keys.some(k => !allowedKeys.includes(k));

        if (hasRestrictedChanges) {
            throw new Error(`La orden ya está en estado ${existing.estado} y no permite modificaciones técnicas.`);
        }
    }

    // Validar cambio a Cerrada o Cancelada
    if ((data.estado === 'Cerrada' || data.estado === 'Cancelada') && !data.motivo_cierre) {
        throw new Error('Es obligatorio proporcionar un motivo para cerrar o cancelar la orden.');
    }

    await this.ordenProduccionRepository.update(id, data);

    // Auditoría de cambio
    if (data.estado && data.estado !== existing.estado) {
        await this.auditService.logStatusChange(usuario, 'OrdenProduccion', id, existing.estado, data.estado, data.motivo_cierre || 'Cambio de estado');
    } else {
        await this.auditService.logUpdate(usuario, 'OrdenProduccion', id, existing, data, 'Actualización de orden');
    }

    return await this.ordenProduccionRepository.findById(id);
  }

  async remove(id) {
    return await this.ordenProduccionRepository.remove(id);
  }
}

module.exports = OrdenProduccionService;
