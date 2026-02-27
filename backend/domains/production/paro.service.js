const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

class ParoService {
  /**
   * @param {ParoRepository} paroRepository
   * @param {BitacoraRepository} bitacoraRepository
   */
  constructor(paroRepository, bitacoraRepository) {
    this.paroRepository = paroRepository;
    this.bitacoraRepository = bitacoraRepository;
  }

  async getParosByProceso(bitacoraId, procesoId) {
    return await this.paroRepository.findByBitacoraAndProceso(bitacoraId, procesoId);
  }

  async create(data) {
    const { bitacora_id, proceso_id, minutos_perdidos } = data;

    // Validar estado de la bitácora
    const bitacora = await this.bitacoraRepository.findById(bitacora_id);
    if (!bitacora) throw new NotFoundError('Bitácora no encontrada.');
    if (bitacora.estado === 'CERRADA') {
      throw new ValidationError('BITACORA_CERRADA_NO_MODIFICABLE');
    }

    // Validar exceso de tiempo
    const status = await this.bitacoraRepository.getProcesoStatus(bitacora_id, proceso_id);
    const tiempoProgramado = status ? status.tiempo_programado_minutos : 480;
    const sumaActual = await this.paroRepository.sumMinutosByBitacoraAndProceso(bitacora_id, proceso_id);

    if (sumaActual + minutos_perdidos > tiempoProgramado) {
      throw new ValidationError(`El tiempo de paro excede el tiempo programado (${tiempoProgramado} min).`);
    }

    const id = await this.paroRepository.create(data);
    return await this.paroRepository.findById(id);
  }

  async update(id, data) {
    const existing = await this.paroRepository.findById(id);
    if (!existing) throw new NotFoundError('Paro no encontrado.');

    // Validar estado de la bitácora
    const bitacora = await this.bitacoraRepository.findById(existing.bitacora_id);
    if (bitacora.estado === 'CERRADA') {
      throw new ValidationError('BITACORA_CERRADA_NO_MODIFICABLE');
    }

    // Validar exceso de tiempo
    const status = await this.bitacoraRepository.getProcesoStatus(existing.bitacora_id, existing.proceso_id);
    const tiempoProgramado = status ? status.tiempo_programado_minutos : 480;
    const sumaActual = await this.paroRepository.sumMinutosByBitacoraAndProceso(existing.bitacora_id, existing.proceso_id);

    const nuevaSuma = sumaActual - existing.minutos_perdidos + data.minutos_perdidos;

    if (nuevaSuma > tiempoProgramado) {
      throw new ValidationError(`El tiempo de paro excede el tiempo programado (${tiempoProgramado} min).`);
    }

    await this.paroRepository.update(id, data);
    return await this.paroRepository.findById(id);
  }

  async delete(id) {
    const existing = await this.paroRepository.findById(id);
    if (!existing) throw new NotFoundError('Paro no encontrado.');

    const bitacora = await this.bitacoraRepository.findById(existing.bitacora_id);
    if (bitacora.estado === 'CERRADA') {
      throw new ValidationError('BITACORA_CERRADA_NO_MODIFICABLE');
    }

    await this.paroRepository.delete(id);
  }

  async getMotivos() {
    return await this.paroRepository.getMotivosCatalogo();
  }
}

module.exports = ParoService;
