// Servicio para gestión de planificación semanal y desviaciones
const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

class PlanningService {
  constructor(planningRepository, auditService) {
    this.planningRepository = planningRepository;
    this.auditService = auditService;
  }

  async getPlan(anio, semana_iso) {
    const plan = await this.planningRepository.findPlanByWeek(anio, semana_iso);
    if (!plan) return null;

    const ordenes = await this.planningRepository.getOrderAssignments(plan.id);
    const personal = await this.planningRepository.getPersonnelAssignments(plan.id);

    return {
      ...plan,
      ordenes,
      personal
    };
  }

  async createPlan(anio, semana_iso) {
    const existing = await this.planningRepository.findPlanByWeek(anio, semana_iso);
    if (existing) {
      throw new ValidationError('Ya existe una planificación para esa semana.');
    }

    const dates = this._getDatesForISOWeek(anio, semana_iso);

    const id = await this.planningRepository.createPlan({
      anio,
      semana_iso,
      fecha_inicio: dates.start,
      fecha_fin: dates.end
    });

    return await this.planningRepository.findPlanById(id);
  }

  async assignOrder(data, usuario) {
    const plan = await this.planningRepository.findPlanById(data.plan_id);
    if (!plan) throw new NotFoundError('Plan no encontrado');
    if (plan.estado === 'CERRADO') throw new ValidationError('No se puede editar un plan cerrado');

    if (plan.estado === 'PUBLICADO' || plan.estado === 'AJUSTADO') {
      // En plan publicado, el registro de desviación es obligatorio
      if (!data.motivo_id) {
        throw new ValidationError('Debe proporcionar un motivo para modificar un plan publicado.');
      }

      await this.recordDeviation({
        plan_id: plan.id,
        proceso_id: data.proceso_id,
        maquina_id: data.maquina_id,
        tipo_desviacion: 'CAMBIO_ORDEN',
        valor_planificado: 'N/A (Adición)',
        valor_ejecutado: `Orden: ${data.orden_id} (Día ${data.dia_semana}, ${data.turno})`,
        motivo_id: data.motivo_id,
        comentario: data.comentario || 'Ajuste de plan publicado',
        usuario
      });

      if (plan.estado === 'PUBLICADO') {
        await this.planningRepository.updatePlanStatus(plan.id, 'AJUSTADO');
        await this.auditService.logStatusChange(usuario, 'PlanSemanal', plan.id, 'PUBLICADO', 'AJUSTADO', 'Ajuste de planificación');
      }
    }

    await this.planningRepository.upsertOrderAssignment(data);
    return { success: true };
  }

  async assignPersonnel(data, usuario) {
    const plan = await this.planningRepository.findPlanById(data.plan_id);
    if (!plan) throw new NotFoundError('Plan no encontrado');
    if (plan.estado === 'CERRADO') throw new ValidationError('No se puede editar un plan cerrado');

    if (plan.estado === 'PUBLICADO' || plan.estado === 'AJUSTADO') {
      if (!data.motivo_id) {
        throw new ValidationError('Debe proporcionar un motivo para modificar un plan publicado.');
      }

      await this.recordDeviation({
        plan_id: plan.id,
        proceso_id: data.proceso_id,
        maquina_id: data.maquina_id,
        tipo_desviacion: 'CAMBIO_PERSONAL',
        valor_planificado: 'N/A (Adición)',
        valor_ejecutado: `Personal: ${data.persona_id} (Día ${data.dia_semana}, ${data.turno})`,
        motivo_id: data.motivo_id,
        comentario: data.comentario || 'Ajuste de plan publicado',
        usuario
      });

      if (plan.estado === 'PUBLICADO') {
        await this.planningRepository.updatePlanStatus(plan.id, 'AJUSTADO');
        await this.auditService.logStatusChange(usuario, 'PlanSemanal', plan.id, 'PUBLICADO', 'AJUSTADO', 'Ajuste de planificación');
      }
    }

    await this.planningRepository.upsertPersonnelAssignment(data);
    return { success: true };
  }

  async updateOrderAssignment(data, usuario) {
    const plan = await this.planningRepository.findPlanById(data.plan_id);
    if (!plan) throw new NotFoundError('Plan no encontrado');
    if (plan.estado === 'CERRADO') throw new ValidationError('No se puede editar un plan cerrado');

    if (plan.estado === 'PUBLICADO' || plan.estado === 'AJUSTADO') {
      if (!data.motivo_id) {
        throw new ValidationError('Debe proporcionar un motivo para modificar un plan publicado.');
      }

      await this.recordDeviation({
        plan_id: plan.id,
        proceso_id: data.proceso_id,
        maquina_id: data.maquina_id,
        tipo_desviacion: 'CAMBIO_ORDEN',
        valor_planificado: `Orden ID: ${data.id} (Modificación)`,
        valor_ejecutado: `Día ${data.dia_semana}, ${data.turno}`,
        motivo_id: data.motivo_id,
        comentario: data.comentario || 'Edición/Movimiento de orden en plan publicado',
        usuario
      });

      if (plan.estado === 'PUBLICADO') {
        await this.planningRepository.updatePlanStatus(plan.id, 'AJUSTADO');
        await this.auditService.logStatusChange(usuario, 'PlanSemanal', plan.id, 'PUBLICADO', 'AJUSTADO', 'Ajuste de planificación');
      }
    }

    await this.planningRepository.updateOrderAssignment(data);
    return { success: true };
  }

  async updatePersonnelAssignment(data, usuario) {
    const plan = await this.planningRepository.findPlanById(data.plan_id);
    if (!plan) throw new NotFoundError('Plan no encontrado');
    if (plan.estado === 'CERRADO') throw new ValidationError('No se puede editar un plan cerrado');

    if (plan.estado === 'PUBLICADO' || plan.estado === 'AJUSTADO') {
      if (!data.motivo_id) {
        throw new ValidationError('Debe proporcionar un motivo para modificar un plan publicado.');
      }

      await this.recordDeviation({
        plan_id: plan.id,
        proceso_id: data.proceso_id,
        maquina_id: data.maquina_id,
        tipo_desviacion: 'CAMBIO_PERSONAL',
        valor_planificado: `Personal ID: ${data.id} (Modificación)`,
        valor_ejecutado: `Día ${data.dia_semana}, ${data.turno}`,
        motivo_id: data.motivo_id,
        comentario: data.comentario || 'Edición/Movimiento de personal en plan publicado',
        usuario
      });

      if (plan.estado === 'PUBLICADO') {
        await this.planningRepository.updatePlanStatus(plan.id, 'AJUSTADO');
        await this.auditService.logStatusChange(usuario, 'PlanSemanal', plan.id, 'PUBLICADO', 'AJUSTADO', 'Ajuste de planificación');
      }
    }

    await this.planningRepository.updatePersonnelAssignment(data);
    return { success: true };
  }

  async deleteOrderAssignment(id, planId, usuario) {
    const plan = await this.planningRepository.findPlanById(planId);
    if (plan.estado === 'CERRADO') throw new ValidationError('No se puede editar un plan cerrado');

    if (plan.estado === 'PUBLICADO') {
      await this.planningRepository.updatePlanStatus(plan.id, 'AJUSTADO');
    }
    await this.planningRepository.deleteOrderAssignment(id);
  }

  async deletePersonnelAssignment(id, planId, usuario) {
    const plan = await this.planningRepository.findPlanById(planId);
    if (plan.estado === 'CERRADO') throw new ValidationError('No se puede editar un plan cerrado');

    if (plan.estado === 'PUBLICADO') {
      await this.planningRepository.updatePlanStatus(plan.id, 'AJUSTADO');
    }
    await this.planningRepository.deletePersonnelAssignment(id);
  }

  async publishPlan(id, usuario) {
    const plan = await this.planningRepository.findPlanById(id);
    if (!plan) throw new NotFoundError('Plan no encontrado');

    if (plan.estado === 'BORRADOR' || plan.estado === 'AJUSTADO') {
      const hasBasal = await this.planningRepository.hasBasalPlan(id);
      if (!hasBasal) {
        await this.planningRepository.createSnapshot(id);
      }

      await this.planningRepository.updatePlanStatus(id, 'PUBLICADO');
      await this.auditService.logStatusChange(usuario, 'PlanSemanal', id, plan.estado, 'PUBLICADO', 'Publicación de plan');
    } else {
      throw new ValidationError(`No se puede publicar un plan en estado ${plan.estado}`);
    }
  }

  async getKPIs(planId) {
    const execution = await this.planningRepository.getExecutionData(planId);
    if (!execution.length) {
      return {
        cumplimiento_global: 0,
        total_ordenes: 0,
        ejecutadas_en_fecha: 0,
        ejecutadas_fuera_fecha: 0,
        no_ejecutadas: 0,
        detalle: []
      };
    }

    const total = execution.length;

    // Ejecutada en fecha = produjo en el día y turno exacto planificado
    const ejecutadasEnFecha = execution.filter(e => {
      // Conversión SQLite (0=Dom, 1=Lun...6=Sab) a Plan (1=Lun...7=Dom)
      let diaEjec = e.dia_ejecutado;
      if (diaEjec === 0) diaEjec = 7;

      return e.bitacora_id &&
        e.cantidad_producida > 0 &&
        e.turno_ejecutado === e.turno &&
        diaEjec === e.dia_semana;
    }).length;

    // Ejecutada fuera de fecha = produjo pero en día o turno distinto
    const ejecutadasFueraFecha = execution.filter(e => {
      let diaEjec = e.dia_ejecutado;
      if (diaEjec === 0) diaEjec = 7;

      return e.bitacora_id &&
        e.cantidad_producida > 0 &&
        (e.turno_ejecutado !== e.turno || diaEjec !== e.dia_semana);
    }).length;

    const noEjecutadas = total - ejecutadasEnFecha - ejecutadasFueraFecha;

    return {
      cumplimiento_global: Math.round((ejecutadasEnFecha / total) * 100),
      total_ordenes: total,
      ejecutadas_en_fecha: ejecutadasEnFecha,
      ejecutadas_fuera_fecha: ejecutadasFueraFecha,
      no_ejecutadas: noEjecutadas,
      detalle: execution
    };
  }

  async getPlanningForShift(date, turno, proceso_id = null) {
    const d = new Date(date);
    const { anio, semana_iso, dia_semana } = this._getISOWeekData(d);
    return await this.planningRepository.getPlanningForShift(anio, semana_iso, dia_semana, turno, proceso_id);
  }

  async getMotivosDesviacion() {
    return await this.planningRepository.getMotivosDesviacion();
  }

  async recordDeviation(data) {
    if (!data.tipo_desviacion) throw new ValidationError('El tipo de desviación es obligatorio');
    await this.planningRepository.recordDeviation(data);
  }

  async getDeviationsByBitacora(bitacoraId) {
    return await this.planningRepository.getDeviationsByBitacora(bitacoraId);
  }

  _getDatesForISOWeek(year, week) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

    const start = new Date(ISOweekStart);
    const end = new Date(ISOweekStart);
    end.setDate(start.getDate() + 6);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  _getISOWeekData(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    let day = new Date(date).getDay();
    if (day === 0) day = 7;

    return {
      anio: d.getFullYear(),
      semana_iso: weekNo,
      dia_semana: day
    };
  }
}

module.exports = PlanningService;
