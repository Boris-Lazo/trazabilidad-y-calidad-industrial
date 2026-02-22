const { sendSuccess } = require('../../shared/response/responseHandler');

class LoteController {
  constructor(loteService) {
    this.loteService = loteService;
  }

  getByOrdenId = async (req, res, next) => {
    try {
      const lotes = await this.loteService.getByOrdenId(req.params.id);
      return sendSuccess(res, lotes);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const lote = await this.loteService.create(req.body);
      return sendSuccess(res, lote, 201);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = LoteController;
