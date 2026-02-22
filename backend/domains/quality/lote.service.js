class LoteService {
  constructor(loteRepository) {
    this.loteRepository = loteRepository;
  }

  async getByOrdenId(ordenId) {
    return await this.loteRepository.findByOrdenId(ordenId);
  }

  async create(data) {
    const id = await this.loteRepository.create(data);
    return await this.loteRepository.findById(id);
  }
}

module.exports = LoteService;
