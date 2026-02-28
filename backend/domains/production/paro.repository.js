class ParoRepository {
  constructor(db) {
    this.db = db;
  }

  async findAll() {
    return await this.db.query(`
      SELECT p.*, m.nombre as motivo_nombre
      FROM PARO_PROCESO p
      JOIN CATALOGO_MOTIVO_PARO m ON p.motivo_id = m.id
      ORDER BY p.fecha_hora DESC
    `);
  }

  async findById(id) {
    return await this.db.get(`
      SELECT p.*, m.nombre as motivo_nombre
      FROM PARO_PROCESO p
      JOIN CATALOGO_MOTIVO_PARO m ON p.motivo_id = m.id
      WHERE p.id = ?
    `, [id]);
  }

  async findByBitacoraAndProceso(bitacoraId, procesoId) {
    return await this.db.query(`
      SELECT p.*, m.nombre as motivo_nombre
      FROM PARO_PROCESO p
      JOIN CATALOGO_MOTIVO_PARO m ON p.motivo_id = m.id
      WHERE p.bitacora_id = ? AND p.proceso_id = ?
      ORDER BY p.fecha_hora ASC
    `, [bitacoraId, procesoId]);
  }

  async sumMinutosByBitacoraAndProceso(bitacoraId, procesoId) {
    const res = await this.db.get(
      'SELECT SUM(minutos_perdidos) as total FROM PARO_PROCESO WHERE bitacora_id = ? AND proceso_id = ? AND fecha_fin IS NOT NULL',
      [bitacoraId, procesoId]
    );
    return res.total || 0;
  }

  async findOpenByProceso(bitacoraId, procesoId) {
    return await this.db.get(
      'SELECT * FROM PARO_PROCESO WHERE bitacora_id = ? AND proceso_id = ? AND fecha_fin IS NULL',
      [bitacoraId, procesoId]
    );
  }

  async create(data) {
    const { bitacora_id, proceso_id, motivo_id, observacion, fecha_inicio } = data;
    const inicio = fecha_inicio || new Date().toISOString();
    const result = await this.db.run(
      'INSERT INTO PARO_PROCESO (bitacora_id, proceso_id, motivo_id, observacion, fecha_inicio, fecha_hora) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [bitacora_id, proceso_id, motivo_id, observacion, inicio]
    );
    return result.lastID;
  }

  async closeParo(id, minutos, fechaFin) {
    const fin = fechaFin || new Date().toISOString();
    await this.db.run(
      'UPDATE PARO_PROCESO SET minutos_perdidos = ?, fecha_fin = ? WHERE id = ?',
      [minutos, fin, id]
    );
  }

  async update(id, data) {
    const { motivo_id, minutos_perdidos, observacion } = data;
    await this.db.run(
      'UPDATE PARO_PROCESO SET motivo_id = ?, minutos_perdidos = ?, observacion = ? WHERE id = ?',
      [motivo_id, minutos_perdidos, observacion, id]
    );
  }

  async delete(id) {
    await this.db.run('DELETE FROM PARO_PROCESO WHERE id = ?', [id]);
  }

  async getMotivosCatalogo() {
    return await this.db.query('SELECT * FROM CATALOGO_MOTIVO_PARO WHERE activo = 1 ORDER BY nombre ASC');
  }
}

module.exports = ParoRepository;
