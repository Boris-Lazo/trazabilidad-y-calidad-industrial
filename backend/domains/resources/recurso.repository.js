class RecursoRepository {
  constructor(db) {
    this.db = db;
  }

  async findAll() {
    return await this.db.query('SELECT * FROM RECURSO ORDER BY nombre ASC');
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM RECURSO WHERE id = ?', [id]);
  }

  async create(data) {
    const { codigo, nombre, descripcion, tipo, unidad_medida } = data;
    const result = await this.db.run(
      'INSERT INTO RECURSO (codigo, nombre, descripcion, tipo, unidad_medida) VALUES (?, ?, ?, ?, ?)',
      [codigo, nombre, descripcion, tipo, unidad_medida]
    );
    return result.lastID;
  }
}

module.exports = RecursoRepository;
