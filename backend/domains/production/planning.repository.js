// Repositorio para planificación operativa semanal
class PlanningRepository {
  constructor(db) {
    this.db = db;
  }

  async findPlanByWeek(anio, semana_iso) {
    return await this.db.get('SELECT * FROM plan_semanal WHERE anio = ? AND semana_iso = ?', [anio, semana_iso]);
  }

  async findPlanById(id) {
    return await this.db.get('SELECT * FROM plan_semanal WHERE id = ?', [id]);
  }

  async createPlan(data) {
    const { anio, semana_iso, fecha_inicio, fecha_fin } = data;
    const result = await this.db.run(
      'INSERT INTO plan_semanal (anio, semana_iso, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)',
      [anio, semana_iso, fecha_inicio, fecha_fin]
    );
    return result.lastID;
  }

  async updatePlanStatus(id, estado) {
    await this.db.run('UPDATE plan_semanal SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [estado, id]);
  }

  async getOrderAssignments(planId) {
    const sql = `
      SELECT pdo.*, op.codigo_orden, op.producto, op.cantidad_objetivo, op.unidad
      FROM plan_detalle_ordenes pdo
      JOIN orden_produccion op ON pdo.orden_id = op.id
      WHERE pdo.plan_id = ?
      ORDER BY pdo.dia_semana, pdo.turno, pdo.proceso_id, pdo.secuencia
    `;
    return await this.db.all(sql, [planId]);
  }

  async getPersonnelAssignments(planId) {
    const sql = `
      SELECT pdp.*, p.nombre, p.apellido, ro.nombre as rol_nombre
      FROM plan_detalle_personal pdp
      JOIN personas p ON pdp.persona_id = p.id
      LEFT JOIN roles_operativos ro ON pdp.rol_operativo_id = ro.id
      WHERE pdp.plan_id = ?
      ORDER BY pdp.dia_semana, pdp.turno, pdp.proceso_id
    `;
    return await this.db.all(sql, [planId]);
  }

  async upsertOrderAssignment(data) {
    const { plan_id, orden_id, proceso_id, maquina_id, turno, dia_semana, secuencia } = data;
    await this.db.run(
      'DELETE FROM plan_detalle_ordenes WHERE plan_id = ? AND orden_id = ? AND proceso_id = ? AND turno = ? AND dia_semana = ?',
      [plan_id, orden_id, proceso_id, turno, dia_semana]
    );
    await this.db.run(
      'INSERT INTO plan_detalle_ordenes (plan_id, orden_id, proceso_id, maquina_id, turno, dia_semana, secuencia) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [plan_id, orden_id, proceso_id, maquina_id, turno, dia_semana, secuencia]
    );
  }

  async upsertPersonnelAssignment(data) {
    const { plan_id, persona_id, proceso_id, maquina_id, turno, dia_semana, rol_operativo_id } = data;
    await this.db.run(
      'DELETE FROM plan_detalle_personal WHERE plan_id = ? AND persona_id = ? AND turno = ? AND dia_semana = ?',
      [plan_id, persona_id, turno, dia_semana]
    );
    await this.db.run(
      'INSERT INTO plan_detalle_personal (plan_id, persona_id, proceso_id, maquina_id, turno, dia_semana, rol_operativo_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [plan_id, persona_id, proceso_id, maquina_id, turno, dia_semana, rol_operativo_id]
    );
  }

  async deleteOrderAssignment(id) {
    await this.db.run('DELETE FROM plan_detalle_ordenes WHERE id = ?', [id]);
  }

  async deletePersonnelAssignment(id) {
    await this.db.run('DELETE FROM plan_detalle_personal WHERE id = ?', [id]);
  }

  async getPlanningForShift(anio, semana_iso, dia_semana, turno, proceso_id = null) {
    const plan = await this.findPlanByWeek(anio, semana_iso);
    if (!plan || plan.estado === 'BORRADOR') return null;

    let sqlO = `SELECT pdo.*, op.codigo_orden FROM plan_detalle_ordenes pdo
                JOIN orden_produccion op ON pdo.orden_id = op.id
                WHERE pdo.plan_id = ? AND pdo.dia_semana = ? AND pdo.turno = ?`;
    let paramsO = [plan.id, dia_semana, turno];
    if (proceso_id) {
        sqlO += " AND pdo.proceso_id = ?";
        paramsO.push(proceso_id);
    }
    sqlO += " ORDER BY pdo.secuencia";
    const ordenes = await this.db.all(sqlO, paramsO);

    let sqlP = `SELECT pdp.*, p.nombre || ' ' || p.apellido as nombre_completo, ro.nombre as rol_nombre
                FROM plan_detalle_personal pdp
                JOIN personas p ON pdp.persona_id = p.id
                LEFT JOIN roles_operativos ro ON pdp.rol_operativo_id = ro.id
                WHERE pdp.plan_id = ? AND pdp.dia_semana = ? AND pdp.turno = ?`;
    let paramsP = [plan.id, dia_semana, turno];
    if (proceso_id) {
        sqlP += " AND pdp.proceso_id = ?";
        paramsP.push(proceso_id);
    }
    const personal = await this.db.all(sqlP, paramsP);

    return { plan, ordenes, personal };
  }

  async getMotivosDesviacion() {
      return await this.db.all('SELECT * FROM catalogo_motivo_desviacion WHERE activo = 1');
  }

  async recordDeviation(data) {
      const { plan_id, bitacora_id, proceso_id, maquina_id, tipo_desviacion, valor_planificado, valor_ejecutado, motivo_id, comentario, usuario } = data;
      await this.db.run(
          `INSERT INTO desviaciones_plan (plan_id, bitacora_id, proceso_id, maquina_id, tipo_desviacion, valor_planificado, valor_ejecutado, motivo_id, comentario, usuario)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [plan_id, bitacora_id, proceso_id, maquina_id, tipo_desviacion, valor_planificado, valor_ejecutado, motivo_id, comentario, usuario]
      );
  }

  async getDeviationsByBitacora(bitacoraId) {
      return await this.db.all(
          `SELECT d.*, m.nombre as motivo_nombre
           FROM desviaciones_plan d
           LEFT JOIN catalogo_motivo_desviacion m ON d.motivo_id = m.id
           WHERE d.bitacora_id = ?`,
          [bitacoraId]
      );
  }
}

module.exports = PlanningRepository;
