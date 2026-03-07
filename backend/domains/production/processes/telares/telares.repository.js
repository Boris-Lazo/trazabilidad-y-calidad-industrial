const BaseProcesoRepository = require('../base/BaseProcesoRepository');

class TelaresRepository extends BaseProcesoRepository {
  constructor(db) {
    super(db, 2); // proceso_id = 2
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
    return await this.db.query("SELECT * FROM CATALOGO_MOTIVO_PARO WHERE activo = 1 ORDER BY nombre ASC");
  }

  async getOrdenEspecificaciones(ordenId) {
    return await this.db.get("SELECT especificaciones FROM orden_produccion WHERE id = ?", [ordenId]);
  }

  async deleteMuestrasByMaquinaYBitacora(maquinaId, bitacoraId, procesoId) {
    await this.db.run("DELETE FROM muestras WHERE maquina_id = ? AND bitacora_id = ? AND proceso_id = ?", [maquinaId, bitacoraId, procesoId]);
  }

  async deleteDefectosVisualesByMaquinaYBitacora(maquinaId, bitacoraId) {
    await this.db.run("DELETE FROM calidad_telares_visual WHERE maquina_id = ? AND bitacora_id = ?", [maquinaId, bitacoraId]);
  }

  async getBitacoraById(bitacoraId) {
    return await this.db.get("SELECT * FROM bitacora_turno WHERE id = ?", [bitacoraId]);
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

  async findByLineaYBitacoraYMaquina(linea_ejecucion_id, bitacora_id, maquina_id) {
    const sql = `SELECT * FROM registros_trabajo WHERE linea_ejecucion_id = ? AND bitacora_id = ? AND maquina_id = ?`;
    return await this.db.get(sql, [linea_ejecucion_id, bitacora_id, maquina_id]);
  }

  async updateRegistro(id, data) {
    const { cantidad_producida, merma_kg, observaciones, parametros, usuario_modificacion } = data;
    const sql = `
      UPDATE registros_trabajo
      SET cantidad_producida = ?, merma_kg = ?, observaciones = ?, parametros = ?, usuario_modificacion = ?
      WHERE id = ?
    `;
    return await this.db.run(sql, [cantidad_producida, merma_kg, observaciones, parametros, usuario_modificacion, id]);
  }
}

module.exports = TelaresRepository;
