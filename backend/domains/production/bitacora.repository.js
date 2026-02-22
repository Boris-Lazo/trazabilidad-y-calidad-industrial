// Repositorio para bitácoras de turno y estados de proceso
class BitacoraRepository {
  constructor(db) {
    this.db = db;
  }

  async findActive() {
    return await this.db.get("SELECT * FROM bitacora_turno WHERE estado = 'EN CURSO'");
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM bitacora_turno WHERE id = ?', [id]);
  }

  async create(data) {
    const { turno, fecha_operativa, inspector, fuera_de_horario } = data;
    const result = await this.db.run(
      'INSERT INTO bitacora_turno (turno, fecha_operativa, inspector, fuera_de_horario) VALUES (?, ?, ?, ?)',
      [turno, fecha_operativa, inspector, fuera_de_horario]
    );
    return result.lastID;
  }

  async close(id) {
    await this.db.run("UPDATE bitacora_turno SET estado = 'CERRADA', fecha_cierre = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  }

  async getResumenProcesos() {
    return await this.db.query('SELECT * FROM PROCESO_TIPO WHERE activo = 1');
  }

  async getRegistrosByProceso(bitacoraId, procesoId) {
    return await this.db.query(`
      SELECT rt.*, op.codigo_orden, op.id as orden_id, pt.unidad_produccion as unidad
      FROM registros_trabajo rt
      LEFT JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
      LEFT JOIN PROCESO_TIPO pt ON le.proceso_tipo_id = pt.id
      LEFT JOIN orden_produccion op ON le.orden_produccion_id = op.id
      WHERE rt.bitacora_id = ? AND (le.proceso_tipo_id = ? OR rt.linea_ejecucion_id IS NULL)
    `, [bitacoraId, procesoId]);
  }

  async getMuestrasByProceso(bitacoraId, procesoId) {
    return await this.db.query('SELECT * FROM muestras WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
  }

  async getProcesoStatus(bitacoraId, procesoId) {
    return await this.db.get('SELECT * FROM bitacora_proceso_status WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
  }

  async deleteProcesoData(bitacoraId, procesoId) {
    await this.db.run(`
        DELETE FROM registros_trabajo
        WHERE bitacora_id = ?
        AND (linea_ejecucion_id IN (SELECT id FROM lineas_ejecucion WHERE proceso_tipo_id = ?) OR linea_ejecucion_id IS NULL)
    `, [bitacoraId, procesoId]);
    await this.db.run('DELETE FROM muestras WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
    await this.db.run('DELETE FROM bitacora_proceso_status WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
  }

  async saveProcesoStatus(bitacoraId, procesoId, no_operativo, motivo) {
    await this.db.run(`
        INSERT INTO bitacora_proceso_status (bitacora_id, proceso_tipo_id, no_operativo, motivo_no_operativo)
        VALUES (?, ?, ?, ?)
    `, [bitacoraId, procesoId, no_operativo ? 1 : 0, motivo]);
  }

  async getInspectores() {
    return await this.db.query("SELECT DISTINCT inspector FROM bitacora_turno UNION SELECT nombre FROM usuarios WHERE rol IN ('ADMIN', 'INSPECTOR')");
  }
}

module.exports = BitacoraRepository;
