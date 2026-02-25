class AuditRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data) {
    const { usuario, accion, entidad, entidad_id, valor_anterior, valor_nuevo, motivo_cambio, categoria_motivo } = data;
    const sql = `
      INSERT INTO auditoria (usuario, accion, entidad, entidad_id, valor_anterior, valor_nuevo, motivo_cambio, categoria_motivo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return await this.db.run(sql, [
      usuario,
      accion,
      entidad,
      entidad_id,
      valor_anterior ? JSON.stringify(valor_anterior) : null,
      valor_nuevo ? JSON.stringify(valor_nuevo) : null,
      motivo_cambio,
      categoria_motivo || null
    ]);
  }

  async findByEntity(entidad, entidad_id) {
    const sql = `SELECT * FROM auditoria WHERE entidad = ? AND entidad_id = ? ORDER BY fecha_hora DESC`;
    return await this.db.query(sql, [entidad, entidad_id]);
  }
}

module.exports = AuditRepository;
