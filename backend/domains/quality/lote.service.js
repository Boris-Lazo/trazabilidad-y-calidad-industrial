const ValidationError = require('../../shared/errors/ValidationError');

class LoteService {
  constructor(loteRepository, auditService) {
    this.loteRepository = loteRepository;
    this.auditService = auditService;
  }

  async getByOrdenId(ordenId) {
    return await this.loteRepository.findByOrdenId(ordenId);
  }

  async getDisponibles() {
    return await this.loteRepository.findDisponibles();
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
      // a. Verificar que el lote existe y no está cerrado
      const lote = await this.loteRepository.findById(loteId);
      if (!lote) {
        throw new ValidationError(`El lote con ID ${loteId} no existe.`);
      }
      if (lote.estado === 'cerrado') {
        throw new ValidationError(`El lote ${lote.codigo_lote} está cerrado y no puede ser declarado como consumido.`);
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

  async cambiarEstado(loteId, nuevoEstado, comentario, usuario) {
    const NotFoundError = require('../../shared/errors/NotFoundError');

    // 1. Obtener lote actual
    const lote = await this.loteRepository.findById(loteId);
    if (!lote) throw new NotFoundError('Lote no encontrado.');

    // 2. Validar estado terminal
    if (lote.estado === 'cerrado') {
      throw new ValidationError('Un lote cerrado no puede cambiar de estado.');
    }

    // 3. Validar transiciones permitidas
    const transicionesPermitidas = {
      activo:  ['pausado', 'cerrado'],
      pausado: ['activo', 'cerrado']
    };
    const permitidas = transicionesPermitidas[lote.estado] || [];
    if (!permitidas.includes(nuevoEstado)) {
      throw new ValidationError(
        `Transición de estado no permitida: ${lote.estado} → ${nuevoEstado}.`
      );
    }

    // 4. Comentario obligatorio para pausado y cerrado
    if (['pausado', 'cerrado'].includes(nuevoEstado)) {
      if (!comentario || comentario.trim().length === 0) {
        throw new ValidationError(
          'El comentario es obligatorio para pausar o cerrar un lote.'
        );
      }
    }

    // 5. Persistir cambio
    await this.loteRepository.updateEstado(loteId, nuevoEstado, comentario || null, usuario);

    // 6. Guardar historial
    await this.loteRepository.saveHistorialEstado({
      lote_id: loteId,
      estado_anterior: lote.estado,
      estado_nuevo: nuevoEstado,
      comentario: comentario || null,
      changed_by: usuario
    });

    // 7. Auditoría
    if (this.auditService) {
      await this.auditService.logChange({
        usuario,
        accion: 'STATUS_CHANGE',
        entidad: 'Lote',
        entidad_id: loteId,
        valor_anterior: { estado: lote.estado },
        valor_nuevo: { estado: nuevoEstado },
        motivo_cambio: comentario || 'Cambio de estado de lote'
      });
    }

    return await this.loteRepository.findById(loteId);
  }

  async getHistorialEstado(loteId) {
    return await this.loteRepository.getHistorialEstado(loteId);
  }

  async getTrazabilidad(loteId) {
    const lote = await this.loteRepository.findById(loteId);
    if (!lote) {
      const NotFoundError = require('../../shared/errors/NotFoundError');
      throw new NotFoundError('Lote no encontrado.');
    }
    const consumos = await this.loteRepository.getConsumoByLoteId(loteId);
    const historial = await this.loteRepository.getHistorialEstado(loteId);
    return { lote, consumos, historial };
  }
}

module.exports = LoteService;
