// Repositorio para tipos de procesos industriales
class ProcesoTipoRepository {
  constructor(db) {
    this.db = db;
  }

  async findAll() {
    return await this.db.query('SELECT * FROM PROCESO_TIPO WHERE activo = 1');
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM PROCESO_TIPO WHERE id = ?', [id]);
  }
}

module.exports = ProcesoTipoRepository;
