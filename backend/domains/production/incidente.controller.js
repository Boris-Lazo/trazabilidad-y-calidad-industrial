const { sendSuccess } = require('../../shared/response/responseHandler');

class IncidenteController {
  /**
   * @param {IncidenteService} incidenteService
   */
  constructor(incidenteService) {
    this.incidenteService = incidenteService;
  }

  getAll = async (req, res, next) => {
    try {
      const incidentes = await this.incidenteService.getAll();
      return sendSuccess(res, incidentes);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const incidente = await this.incidenteService.create(req.body);
      return sendSuccess(res, incidente, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const incidente = await this.incidenteService.update(req.params.id, req.body);
      return sendSuccess(res, incidente);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = IncidenteController;
