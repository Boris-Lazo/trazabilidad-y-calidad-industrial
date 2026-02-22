class QualityMuestraRepository {
  constructor(db) {
    this.db = db;
  }

  async findByLoteId(loteId) {
    return await this.db.query('SELECT * FROM muestras WHERE lote_id = ?', [loteId]);
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM muestras WHERE id = ?', [id]);
  }

  async create(data) {
    const { codigo_muestra, fecha_analisis, lote_id } = data;
    const result = await this.db.run(
      'INSERT INTO muestras (codigo_muestra, fecha_analisis, lote_id) VALUES (?, ?, ?)',
      [codigo_muestra, fecha_analisis, lote_id]
    );
    return result.lastID;
  }
}

module.exports = QualityMuestraRepository;
