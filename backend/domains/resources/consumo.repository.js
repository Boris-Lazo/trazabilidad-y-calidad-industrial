class ConsumoRepository {
  constructor(db) {
    this.db = db;
  }

  async findByRegistroId(registroId) {
    return await this.db.query('SELECT * FROM CONSUMO WHERE registro_trabajo_id = ? ORDER BY timestamp_consumo DESC', [registroId]);
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM CONSUMO WHERE id = ?', [id]);
  }

  async create(data) {
    const { registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo } = data;
    const result = await this.db.run(
      'INSERT INTO CONSUMO (registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo) VALUES (?, ?, ?, ?)',
      [registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo]
    );
    return result.lastID;
  }
}

module.exports = ConsumoRepository;
