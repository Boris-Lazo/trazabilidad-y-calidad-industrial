// Repositorio para bitácoras de turno y estados de proceso
class BitacoraRepository {
  constructor(db) {
    this.db = db;
  }

  async findActive() {
    return await this.db.get("SELECT * FROM bitacora_turno WHERE estado IN ('ABIERTA', 'REVISION')");
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

  async updateEstado(id, estado) {
      const sql = estado === 'CERRADA'
        ? "UPDATE bitacora_turno SET estado = ?, fecha_cierre = CURRENT_TIMESTAMP WHERE id = ?"
        : "UPDATE bitacora_turno SET estado = ? WHERE id = ?";
      await this.db.run(sql, [estado, id]);
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
    // Deprecated: No usar borrado destructivo. Usar marcado de inactividad o auditoría si es necesario.
    // Se mantiene por compatibilidad temporal si es estrictamente necesario, pero se debe migrar a upsert.
    await this.db.run(`
        DELETE FROM registros_trabajo
        WHERE bitacora_id = ?
        AND (linea_ejecucion_id IN (SELECT id FROM lineas_ejecucion WHERE proceso_tipo_id = ?) OR linea_ejecucion_id IS NULL)
    `, [bitacoraId, procesoId]);
    await this.db.run('DELETE FROM muestras WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
    await this.db.run('DELETE FROM bitacora_proceso_status WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
  }

  async getRegistroByLineaYBitacora(lineaId, bitacoraId, maquinaId) {
    if (maquinaId) {
        return await this.db.get('SELECT * FROM registros_trabajo WHERE linea_ejecucion_id = ? AND bitacora_id = ? AND maquina_id = ?', [lineaId, bitacoraId, maquinaId]);
    }
    return await this.db.get('SELECT * FROM registros_trabajo WHERE linea_ejecucion_id = ? AND bitacora_id = ?', [lineaId, bitacoraId]);
  }

  async updateProcesoStatus(bitacoraId, procesoId, no_operativo, motivo) {
      await this.db.run(`
          INSERT INTO bitacora_proceso_status (bitacora_id, proceso_tipo_id, no_operativo, motivo_no_operativo)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(bitacora_id, proceso_tipo_id) DO UPDATE SET
            no_operativo = excluded.no_operativo,
            motivo_no_operativo = excluded.motivo_no_operativo
      `, [bitacoraId, procesoId, no_operativo ? 1 : 0, motivo]);
  }

  async saveProcesoStatus(bitacoraId, procesoId, no_operativo, motivo) {
    await this.db.run(`
        INSERT INTO bitacora_proceso_status (bitacora_id, proceso_tipo_id, no_operativo, motivo_no_operativo)
        VALUES (?, ?, ?, ?)
    `, [bitacoraId, procesoId, no_operativo ? 1 : 0, motivo]);
  }

  async getInspectores() {
    const { ROLE_PERMISSIONS, PERMISSIONS } = require('../../shared/auth/permissions');

    // Identificar roles que tienen permiso de inspección/asignación
    const rolesConPermiso = Object.keys(ROLE_PERMISSIONS).filter(rol =>
        ROLE_PERMISSIONS[rol].includes(PERMISSIONS.ASSIGN_OPERATIONS)
    );

    const sql = `
      SELECT DISTINCT p.nombre || ' ' || p.apellido as nombre
      FROM personas p
      JOIN usuarios u ON p.id = u.persona_id
      JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre IN (${rolesConPermiso.map(r => `'${r}'`).join(',')})
      AND p.estado_laboral = 'Activo'
      AND u.estado_usuario = 'Activo'
    `;
    // Nota: El admin técnico está excluido al no tener Persona asociada.
    return await this.db.query(sql);
  }

  async checkAssignmentsForProcess(procesoId, shift) {
    const sql = `
      SELECT COUNT(*) as count
      FROM asignaciones_operativas
      WHERE proceso_tipo_id = ? AND turno = ?
      AND (fecha_fin IS NULL OR fecha_fin > CURRENT_TIMESTAMP)
    `;
    const res = await this.db.get(sql, [procesoId, shift]);
    return res.count > 0;
  }

  async withTransaction(fn) {
    return await this.db.withTransaction(fn);
  }
}

module.exports = BitacoraRepository;
