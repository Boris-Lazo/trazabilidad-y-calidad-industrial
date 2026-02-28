class LoteRepository {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const sql = `
      SELECT l.*, op.codigo_orden
      FROM lotes l
      JOIN orden_produccion op ON l.orden_produccion_id = op.id
      WHERE l.id = ?
    `;
    return await this.db.get(sql, [id]);
  }

  async findByOrdenId(ordenId) {
    const sql = `
      SELECT l.*, op.codigo_orden
      FROM lotes l
      JOIN orden_produccion op ON l.orden_produccion_id = op.id
      WHERE l.orden_produccion_id = ?
      ORDER BY l.correlativo ASC
    `;
    return await this.db.query(sql, [ordenId]);
  }

  async findByBitacoraYOrden(bitacoraId, ordenId) {
    const sql = `
      SELECT * FROM lotes
      WHERE bitacora_id = ? AND orden_produccion_id = ?
      LIMIT 1
    `;
    return await this.db.get(sql, [bitacoraId, ordenId]);
  }

  async getMaxCorrelativo(ordenId) {
    const sql = `
      SELECT MAX(correlativo) as max_correlativo
      FROM lotes WHERE orden_produccion_id = ?
    `;
    const row = await this.db.get(sql, [ordenId]);
    return row ? (row.max_correlativo || 0) : 0;
  }

  async findOrdenCodigo(ordenId) {
    const sql = `SELECT codigo_orden FROM orden_produccion WHERE id = ?`;
    const row = await this.db.get(sql, [ordenId]);
    return row ? row.codigo_orden : null;
  }

  async create(data) {
    const { codigo_lote, orden_produccion_id, bitacora_id, correlativo, fecha_produccion, estado, created_by } = data;
    const sql = `
      INSERT INTO lotes
      (codigo_lote, orden_produccion_id, bitacora_id, correlativo, fecha_produccion, estado, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `;
    const result = await this.db.run(sql, [
      codigo_lote, orden_produccion_id, bitacora_id, correlativo, fecha_produccion, estado, created_by
    ]);
    return result.lastID;
  }

  async updateEstado(id, nuevoEstado, comentario, updatedBy) {
    const sql = `
      UPDATE lotes SET
        estado = ?,
        comentario_estado = ?,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = ?,
        motivo_cambio = ?
      WHERE id = ?
    `;
    return await this.db.run(sql, [nuevoEstado, comentario, updatedBy, comentario, id]);
  }

  async findDisponibles() {
    const sql = `
      SELECT l.*, op.codigo_orden
      FROM lotes l
      JOIN orden_produccion op ON l.orden_produccion_id = op.id
      WHERE l.estado IN ('activo', 'pausado')
      ORDER BY l.fecha_produccion DESC, l.created_at DESC
    `;
    return await this.db.query(sql);
  }

  async saveConsumoTelar(data) {
    const { registro_trabajo_id, maquina_id, bitacora_id, lote_id, created_by } = data;
    const sql = `
      INSERT INTO telar_consumo_lote
      (registro_trabajo_id, maquina_id, bitacora_id, lote_id, created_at, created_by)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `;
    return await this.db.run(sql, [
      registro_trabajo_id, maquina_id, bitacora_id, lote_id, created_by
    ]);
  }

  async deleteConsumoByRegistro(registroTrabajoId) {
    const sql = `DELETE FROM telar_consumo_lote WHERE registro_trabajo_id = ?`;
    return await this.db.run(sql, [registroTrabajoId]);
  }

  async deleteConsumoByMaquinaYBitacora(maquinaId, bitacoraId) {
    const sql = `DELETE FROM telar_consumo_lote WHERE maquina_id = ? AND bitacora_id = ?`;
    return await this.db.run(sql, [maquinaId, bitacoraId]);
  }

  async getConsumoByMaquinaYBitacora(maquinaId, bitacoraId) {
    const sql = `
      SELECT tcl.*, l.codigo_lote, op.codigo_orden
      FROM telar_consumo_lote tcl
      JOIN lotes l ON tcl.lote_id = l.id
      JOIN orden_produccion op ON l.orden_produccion_id = op.id
      WHERE tcl.maquina_id = ? AND tcl.bitacora_id = ?
      ORDER BY tcl.created_at ASC
    `;
    return await this.db.query(sql, [maquinaId, bitacoraId]);
  }

  async saveHistorialEstado(data) {
    const { lote_id, estado_anterior, estado_nuevo, comentario, changed_by } = data;
    const sql = `
      INSERT INTO lote_historial_estado
      (lote_id, estado_anterior, estado_nuevo, comentario, changed_by, changed_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    return await this.db.run(sql, [lote_id, estado_anterior, estado_nuevo, comentario || null, changed_by]);
  }

  async getHistorialEstado(loteId) {
    const sql = `
      SELECT * FROM lote_historial_estado
      WHERE lote_id = ?
      ORDER BY changed_at DESC
    `;
    return await this.db.query(sql, [loteId]);
  }

  async getConsumoByLoteId(loteId) {
    const sql = `
      SELECT tcl.*, m.nombre_visible as codigo_telar,
        bt.fecha_operativa, bt.turno
      FROM telar_consumo_lote tcl
      JOIN MAQUINAS m ON tcl.maquina_id = m.id
      JOIN bitacora_turno bt ON tcl.bitacora_id = bt.id
      WHERE tcl.lote_id = ?
      ORDER BY tcl.created_at ASC
    `;
    return await this.db.query(sql, [loteId]);
  }
}

module.exports = LoteRepository;
