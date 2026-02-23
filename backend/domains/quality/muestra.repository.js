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
    const {
      codigo_muestra, fecha_analisis, lote_id, bitacora_id,
      proceso_tipo_id, maquina_id, resultado, valor,
      parametro, valor_nominal, usuario_modificacion
    } = data;

    const sql = `
      INSERT INTO muestras (
        codigo_muestra, fecha_analisis, lote_id, bitacora_id,
        proceso_tipo_id, maquina_id, resultado, valor,
        parametro, valor_nominal, usuario_modificacion, fecha_modificacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const result = await this.db.run(sql, [
      codigo_muestra, fecha_analisis || new Date().toISOString().split('T')[0],
      lote_id, bitacora_id, proceso_tipo_id, maquina_id,
      resultado, valor, parametro, valor_nominal, usuario_modificacion
    ]);
    return result.lastID;
  }
}

module.exports = QualityMuestraRepository;
