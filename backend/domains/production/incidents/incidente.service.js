class IncidenteService {
  /**
   * @param {IncidenteRepository} incidenteRepository
   */
  constructor(incidenteRepository) {
    this.incidenteRepository = incidenteRepository;
  }

  async getAll() {
    return await this.incidenteRepository.findAll();
  }

  async create(data) {
    const id = await this.incidenteRepository.create(data);
    return await this.incidenteRepository.findById(id);
  }

  async update(id, data) {
    await this.incidenteRepository.update(id, data);
    return await this.incidenteRepository.findById(id);
  }
}

module.exports = IncidenteService;
