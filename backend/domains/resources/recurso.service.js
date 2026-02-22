class RecursoService {
  constructor(recursoRepository) {
    this.recursoRepository = recursoRepository;
  }

  async getAll() {
    return await this.recursoRepository.findAll();
  }

  async create(data) {
    const id = await this.recursoRepository.create(data);
    return await this.recursoRepository.findById(id);
  }
}

module.exports = RecursoService;
