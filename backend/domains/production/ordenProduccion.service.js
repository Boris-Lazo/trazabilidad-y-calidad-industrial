// Servicio para órdenes de producción
class OrdenProduccionService {
  /**
   * @param {OrdenProduccionRepository} ordenProduccionRepository
   */
  constructor(ordenProduccionRepository) {
    this.ordenProduccionRepository = ordenProduccionRepository;
  }

  async getAll() {
    return await this.ordenProduccionRepository.findAll();
  }

  async getById(id) {
    return await this.ordenProduccionRepository.findById(id);
  }

  async create(data) {
    const id = await this.ordenProduccionRepository.create(data);
    return await this.ordenProduccionRepository.findById(id);
  }

  async update(id, data) {
    await this.ordenProduccionRepository.update(id, data);
    return await this.ordenProduccionRepository.findById(id);
  }

  async remove(id) {
    return await this.ordenProduccionRepository.remove(id);
  }
}

module.exports = OrdenProduccionService;
