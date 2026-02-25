
class TelaresRepository {
  constructor(db) {
    this.db = db;
  }

  async getAllMaquinas() {
    return await this.db.query("SELECT * FROM MAQUINAS WHERE proceso_id = 2 AND activo = 1");
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
    return await this.db.query("SELECT * FROM muestras WHERE bitacora_id = ? AND proceso_id = 2", [bitacoraId]);
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

  async getProcesoTelaresId() {
    return 2; // Telares es ID 2 según contrato estático
  }

  async getOrdenEspecificaciones(ordenId) {
    return await this.db.get("SELECT especificaciones FROM orden_produccion WHERE id = ?", [ordenId]);
  }

  async deleteMachineRecords(bitacoraId, maquinaId) {
    await this.db.run("DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
    await this.db.run("DELETE FROM muestras WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
    await this.db.run("DELETE FROM calidad_telares_visual WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
    await this.db.run("DELETE FROM incidentes WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
  }

  async saveDefectoVisual(data) {
    const { bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion } = data;
    return await this.db.run(
      "INSERT INTO calidad_telares_visual (bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion]
    );
  }

  async saveIncidente(data) {
    const { titulo, descripcion, severidad, maquina_id, bitacora_id } = data;
    return await this.db.run(
      "INSERT INTO incidentes (titulo, descripcion, severidad, maquina_id, bitacora_id, fecha_creacion, estado) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'abierto')",
      [titulo, descripcion, severidad, maquina_id, bitacora_id]
    );
  }

  async withTransaction(fn) {
    return await this.db.withTransaction(fn);
  }
}

module.exports = TelaresRepository;
