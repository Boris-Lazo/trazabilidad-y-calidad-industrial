class LoteRepository {
  constructor(db) {
    this.db = db;
  }

  async findByOrdenId(ordenId) {
    return await this.db.query('SELECT * FROM lotes WHERE orden_produccion_id = ?', [ordenId]);
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM lotes WHERE id = ?', [id]);
  }

  async create(data) {
    const { codigo_lote, fecha_produccion, orden_produccion_id } = data;
    const result = await this.db.run(
      'INSERT INTO lotes (codigo_lote, fecha_produccion, orden_produccion_id) VALUES (?, ?, ?)',
      [codigo_lote, fecha_produccion, orden_produccion_id]
    );
    return result.lastID;
  }
}

module.exports = LoteRepository;
