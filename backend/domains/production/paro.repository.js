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

  async findByBitacoraProcesoYMaquina(bitacoraId, procesoId, maquinaId) {
    // Nota: PARO_PROCESO no tiene columna maquina_id en el esquema canónico.
    // Se filtra por bitacora y proceso (el proceso_id identifica los paros del telar).
    return await this.findByBitacoraAndProceso(bitacoraId, procesoId);
  }

  async sumMinutosByBitacoraAndProceso(bitacoraId, procesoId) {
    const res = await this.db.get(
      'SELECT SUM(minutos_perdidos) as total FROM PARO_PROCESO WHERE bitacora_id = ? AND proceso_id = ?',
      [bitacoraId, procesoId]
    );
    return res.total || 0;
  }

  async create(data) {
    const { bitacora_id, proceso_id, motivo_id, minutos_perdidos, observacion } = data;
    const result = await this.db.run(
      'INSERT INTO PARO_PROCESO (bitacora_id, proceso_id, motivo_id, minutos_perdidos, observacion, fecha_hora) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [bitacora_id, proceso_id, motivo_id, minutos_perdidos, observacion]
    );
    return result.lastID;
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
