const ValidationError = require('../../shared/errors/ValidationError');

class LoteService {
  constructor(loteRepository, auditService) {
    this.loteRepository = loteRepository;
    this.auditService = auditService;
  }

  async getByOrdenId(ordenId) {
    return await this.loteRepository.findByOrdenId(ordenId);
  }

  async getActivos() {
    return await this.loteRepository.findActivos();
  }

  async getConsumoTelar(maquinaId, bitacoraId) {
    return await this.loteRepository.getConsumoByMaquinaYBitacora(maquinaId, bitacoraId);
  }

  async generarOObtenerLote(ordenId, bitacoraId, fechaProduccion, usuario) {
    // 1. Buscar si ya existe lote para esta bitácora + orden
    let lote = await this.loteRepository.findByBitacoraYOrden(bitacoraId, ordenId);

    // 2. Si existe, retornarlo directamente (con el join de codigo_orden)
    if (lote) {
      return await this.loteRepository.findById(lote.id);
    }

    // 3. Si no existe:
    // a. maxCorrelativo
    const maxCorrelativo = await this.loteRepository.getMaxCorrelativo(ordenId);
    const nuevoCorrelativo = maxCorrelativo + 1;

    // c. Obtener codigo_orden
    const codigoOrden = await this.loteRepository.findOrdenCodigo(ordenId);
    if (!codigoOrden) {
        throw new ValidationError('No se encontró el código de la orden de producción.');
    }

    // d. codigoLote
    const codigoLote = `${codigoOrden}-${String(nuevoCorrelativo).padStart(3, '0')}`;

    // e. Crear el lote
    const nuevoId = await this.loteRepository.create({
      codigo_lote: codigoLote,
      orden_produccion_id: ordenId,
      bitacora_id: bitacoraId,
      correlativo: nuevoCorrelativo,
      fecha_produccion: fechaProduccion,
      estado: 'activo',
      created_by: usuario
    });

    // f. Registrar en auditoría
    if (this.auditService) {
        await this.auditService.logChange({
            usuario,
            accion: 'CREATE',
            entidad: 'Lote',
            entidad_id: nuevoId,
            valor_nuevo: { codigo_lote: codigoLote },
            motivo_cambio: 'Generación automática de lote'
        });
    }

    // g. Retornar findById
    return await this.loteRepository.findById(nuevoId);
  }

  async guardarConsumoTelar(maquinaId, bitacoraId, loteIds, registroTrabajoId, usuario) {
    // 1. deleteConsumoByRegistro
    await this.loteRepository.deleteConsumoByRegistro(registroTrabajoId);

    // 2. Para cada loteId en loteIds
    for (const loteId of loteIds) {
      // a. Verificar que el lote existe y está activo
      const lote = await this.loteRepository.findById(loteId);
      if (!lote) {
        throw new ValidationError(`El lote con ID ${loteId} no existe.`);
      }
      if (lote.estado !== 'activo') {
        throw new ValidationError(`El lote ${lote.codigo_lote} no está activo y no puede ser consumido.`);
      }

      // b. saveConsumoTelar
      await this.loteRepository.saveConsumoTelar({
        registro_trabajo_id: registroTrabajoId,
        maquina_id: maquinaId,
        bitacora_id: bitacoraId,
        lote_id: loteId,
        created_by: usuario
      });
    }
  }
}

module.exports = LoteService;
