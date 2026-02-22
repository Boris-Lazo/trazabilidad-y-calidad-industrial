
class TelaresRepository {
  constructor(db) {
    this.db = db;
  }

  async getAllMaquinas() {
    return await this.db.query("SELECT * FROM MAQUINAS WHERE proceso_tipo_id = (SELECT id FROM PROCESO_TIPO WHERE nombre = 'Telares') AND activo = 1");
  }

  async getStatusMaquinas(bitacoraId) {
    return await this.db.query("SELECT * FROM bitacora_maquina_status WHERE bitacora_id = ?", [bitacoraId]);
  }

  async getRegistrosByBitacora(bitacoraId) {
    return await this.db.query(`
      SELECT rt.*, op.codigo_orden, op.id as orden_id, m.codigo as maquina_codigo, op.especificaciones
      FROM registros_trabajo rt
      JOIN MAQUINAS m ON rt.maquina_id = m.id
      LEFT JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
      LEFT JOIN orden_produccion op ON le.orden_produccion_id = op.id
      WHERE rt.bitacora_id = ?
    `, [bitacoraId]);
  }

  async getMuestrasByBitacora(bitacoraId) {
    return await this.db.query("SELECT * FROM muestras WHERE bitacora_id = ? AND proceso_tipo_id = (SELECT id FROM PROCESO_TIPO WHERE nombre = 'Telares')", [bitacoraId]);
  }

  async getDefectosVisuales(bitacoraId) {
    return await this.db.query("SELECT * FROM calidad_telares_visual WHERE bitacora_id = ?", [bitacoraId]);
  }

  async getIncidentesByBitacora(bitacoraId) {
    return await this.db.query("SELECT i.*, m.codigo as maquina_codigo FROM incidentes i JOIN MAQUINAS m ON i.maquina_id = m.id WHERE i.bitacora_id = ?", [bitacoraId]);
  }

  async getParoTipos() {
    return await this.db.query("SELECT * FROM PARO_TIPO WHERE activo = 1");
  }

  async saveMaquinaStatus(bitacoraId, maquinaId, estado, observacion) {
    await this.db.run(`
      INSERT INTO bitacora_maquina_status (bitacora_id, maquina_id, estado, observacion_advertencia)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(bitacora_id, maquina_id) DO UPDATE SET estado = EXCLUDED.estado, observacion_advertencia = EXCLUDED.observacion_advertencia
    `, [bitacoraId, maquinaId, estado, observacion]);
  }

  async withTransaction(fn) {
    return await this.db.withTransaction(fn);
  }
}

module.exports = TelaresRepository;
