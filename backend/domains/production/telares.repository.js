
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
    return await this.db.query(`
      SELECT cv.*, op.codigo_orden
      FROM calidad_telares_visual cv
      LEFT JOIN orden_produccion op ON cv.orden_id = op.id
      WHERE cv.bitacora_id = ?
    `, [bitacoraId]);
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
    return 2;
  }

  async getOrdenEspecificaciones(ordenId) {
    return await this.db.get("SELECT especificaciones FROM orden_produccion WHERE id = ?", [ordenId]);
  }

  async deleteMachineRecords(bitacoraId, maquinaId) {
    await this.db.run("DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
    await this.db.run("DELETE FROM muestras WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
    await this.db.run("DELETE FROM calidad_telares_visual WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
    await this.db.run("DELETE FROM paros WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
    await this.db.run("DELETE FROM incidentes WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
  }

  async getUltimoAcumulado(maquinaId, bitacoraId) {
    const row = await this.db.get(`
      SELECT parametros
      FROM registros_trabajo
      WHERE maquina_id = ? AND bitacora_id != ?
      ORDER BY created_at DESC LIMIT 1
    `, [maquinaId, bitacoraId]);

    if (!row || !row.parametros) return 0;
    try {
      const params = JSON.parse(row.parametros);
      return params.acumulado_contador || 0;
    } catch (e) {
      return 0;
    }
  }

  async getParosByMaquina(bitacoraId, maquinaId) {
    return await this.db.query(`
      SELECT p.*, pt.nombre as tipo_nombre
      FROM paros p
      JOIN PARO_TIPO pt ON p.paro_tipo_id = pt.id
      WHERE p.bitacora_id = ? AND p.maquina_id = ?
    `, [bitacoraId, maquinaId]);
  }

  async saveParo(data) {
    const { bitacora_id, maquina_id, paro_tipo_id, minutos, justificacion, usuario_modificacion } = data;
    return await this.db.run(`
      INSERT INTO paros (bitacora_id, maquina_id, proceso_id,
      paro_tipo_id, minutos, justificacion, usuario_modificacion,
      created_at)
      VALUES (?, ?, 2, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [bitacora_id, maquina_id, paro_tipo_id, minutos, justificacion, usuario_modificacion]);
  }

  async getMuestrasByMaquina(bitacoraId, maquinaId) {
    return await this.db.query("SELECT * FROM muestras WHERE bitacora_id = ? AND maquina_id = ? AND proceso_id = 2", [bitacoraId, maquinaId]);
  }

  async saveDefectoVisual(data) {
    const { bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion } = data;
    return await this.db.run(
      "INSERT INTO calidad_telares_visual (bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion]
    );
  }

  async getIncidentesByBitacora(bitacoraId) {
    return await this.db.query("SELECT i.*, m.codigo as maquina_codigo FROM incidentes i JOIN MAQUINAS m ON i.maquina_id = m.id WHERE i.bitacora_id = ?", [bitacoraId]);
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
