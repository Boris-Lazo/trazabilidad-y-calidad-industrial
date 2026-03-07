const ValidationError = require('../../../../shared/errors/ValidationError');
const NotFoundError = require('../../../../shared/errors/NotFoundError');

class BaseProcesoService {
  constructor(repository, loteService, lineaEjecucionRepository, auditService, config) {
    this.repository = repository;
    this.loteService = loteService;
    this.lineaEjecucionRepository = lineaEjecucionRepository;
    this.auditService = auditService;
    this.config = config; // { procesoId, digitoOrden, codigoMaquina }
  }

  async validarOrden(ordenId) {
    const codigoOrden = await this.repository.findOrdenCodigo(ordenId);
    if (!codigoOrden) {
      throw new ValidationError(`La orden ID ${ordenId} no existe.`);
    }

    if (this.config.digitoOrden && !codigoOrden.startsWith(this.config.digitoOrden)) {
      throw new ValidationError(`La orden ${codigoOrden} no pertenece a este proceso.`);
    }

    const orden = await this.repository.getOrdenById(ordenId);
    if (orden && orden.estado === 'Cancelada') {
      throw new ValidationError(`La orden ${codigoOrden} está cancelada.`);
    }
    return orden;
  }

  async obtenerOCrearLineaEjecucion(ordenId, maquinaId) {
    let linea = await this.lineaEjecucionRepository.findByOrdenAndProceso(
      ordenId,
      this.config.procesoId,
      maquinaId
    );
    if (!linea) {
      const lineaId = await this.lineaEjecucionRepository.create(
        ordenId,
        this.config.procesoId,
        maquinaId
      );
      linea = { id: lineaId };
    }
    return linea;
  }

  async guardarRegistroTrabajo(data) {
    return await this.repository.saveRegistroTrabajo(data);
  }

  async generarLote(ordenId, bitacoraId, usuario) {
    const fechaHoy = new Date().toISOString().split('T')[0];
    return await this.loteService.generarOObtenerLote(ordenId, bitacoraId, fechaHoy, usuario);
  }

  async actualizarEstado(bitacoraId, maquinaId, estado, observaciones) {
    return await this.repository.saveEstadoMaquina(bitacoraId, maquinaId, estado, observaciones);
  }

  async getDetalle(bitacoraId) {
    const maquina = await this.repository.getMaquina();
    const statusMaquina = await this.repository.getEstadoMaquina(bitacoraId, maquina.id);
    const ultimoRegistro = await this.repository.getUltimoRegistro(bitacoraId, maquina.id);

    let lote = null;
    if (ultimoRegistro && ultimoRegistro.orden_id) {
      lote = await this.loteService.getByBitacoraYOrden(bitacoraId, ultimoRegistro.orden_id);
    }

    return {
      maquina,
      estado_proceso: statusMaquina ? statusMaquina.estado : 'Sin datos',
      ultimo_registro: ultimoRegistro,
      lote: lote
    };
  }
}

module.exports = BaseProcesoService;
