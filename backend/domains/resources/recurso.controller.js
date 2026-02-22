const { sendSuccess } = require('../../shared/response/responseHandler');

class RecursoController {
  constructor(recursoService) {
    this.recursoService = recursoService;
  }

  getAll = async (req, res, next) => {
    try {
      const recursos = await this.recursoService.getAll();
      return sendSuccess(res, recursos);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const recurso = await this.recursoService.create(req.body);
      return sendSuccess(res, recurso, 201);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = RecursoController;
