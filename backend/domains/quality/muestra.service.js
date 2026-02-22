class QualityMuestraService {
  constructor(muestraRepository) {
    this.muestraRepository = muestraRepository;
  }

  async getByLoteId(loteId) {
    return await this.muestraRepository.findByLoteId(loteId);
  }

  async create(data) {
    const id = await this.muestraRepository.create(data);
    return await this.muestraRepository.findById(id);
  }
}

module.exports = QualityMuestraService;
