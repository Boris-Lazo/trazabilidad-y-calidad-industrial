// Controller para el módulo de planificación operativa semanal
class PlanningController {
  constructor(planningService) {
    this.planningService = planningService;
  }

  getPlan = async (req, res, next) => {
    try {
      const { anio, semana } = req.params;
      const plan = await this.planningService.getPlan(Number(anio), Number(semana));
      if (!plan) {
        return res.json({ message: 'No existe planificación para esta semana', plan: null });
      }
      res.json(plan);
    } catch (err) {
      next(err);
    }
  };

  recordDeviation = async (req, res, next) => {
    try {
      await this.planningService.recordDeviation({
        ...req.body,
        usuario: req.user.username
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  createPlan = async (req, res, next) => {
    try {
      const { anio, semana } = req.body;
      const plan = await this.planningService.createPlan(Number(anio), Number(semana));
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  };

  assignOrder = async (req, res, next) => {
    try {
      await this.planningService.assignOrder(req.body, req.user.username);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  assignPersonnel = async (req, res, next) => {
    try {
      await this.planningService.assignPersonnel(req.body, req.user.username);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  updateOrder = async (req, res, next) => {
    try {
      await this.planningService.updateOrderAssignment(req.body, req.user.username);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  updatePersonnel = async (req, res, next) => {
    try {
      await this.planningService.updatePersonnelAssignment(req.body, req.user.username);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  deleteOrder = async (req, res, next) => {
    try {
      const { id, plan_id } = req.body;
      await this.planningService.deleteOrderAssignment(id, plan_id, req.user.username);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  deletePersonnel = async (req, res, next) => {
    try {
      const { id, plan_id } = req.body;
      await this.planningService.deletePersonnelAssignment(id, plan_id, req.user.username);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  publish = async (req, res, next) => {
    try {
      const { id } = req.body;
      await this.planningService.publishPlan(id, req.user.username);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  getMotivosDesviacion = async (req, res, next) => {
    try {
      const motivos = await this.planningService.getMotivosDesviacion();
      res.json(motivos);
    } catch (err) {
      next(err);
    }
  };

  getDeviaciones = async (req, res, next) => {
    try {
      const { bitacora_id } = req.query;
      const desviaciones = await this.planningService.getDeviationsByBitacora(bitacora_id);
      res.json(desviaciones);
    } catch (err) {
      next(err);
    }
  };

  getKPIs = async (req, res, next) => {
    try {
      const { plan_id } = req.params;
      const kpis = await this.planningService.getKPIs(plan_id);
      res.json(kpis);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = PlanningController;
