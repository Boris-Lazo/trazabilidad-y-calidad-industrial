class ConsumoService {
  constructor(consumoRepository) {
    this.consumoRepository = consumoRepository;
  }

  async getByRegistroId(registroId) {
    return await this.consumoRepository.findByRegistroId(registroId);
  }

  async create(data) {
    const id = await this.consumoRepository.create(data);
    return await this.consumoRepository.findById(id);
  }
}

module.exports = ConsumoService;
