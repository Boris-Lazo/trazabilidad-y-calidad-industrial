// Servicio para tipos de procesos
class ProcesoTipoService {
  /**
   * @param {ProcesoTipoRepository} procesoTipoRepository
   */
  constructor(procesoTipoRepository) {
    this.procesoTipoRepository = procesoTipoRepository;
  }

  async getAllActive() {
    return await this.procesoTipoRepository.findAll();
  }

  async getById(id) {
    return await this.procesoTipoRepository.findById(id);
  }
}

module.exports = ProcesoTipoService;
