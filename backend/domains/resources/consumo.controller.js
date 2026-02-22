const { sendSuccess } = require('../../shared/response/responseHandler');

class ConsumoController {
  constructor(consumoService) {
    this.consumoService = consumoService;
  }

  getByRegistroId = async (req, res, next) => {
    try {
      const consumos = await this.consumoService.getByRegistroId(req.params.id);
      return sendSuccess(res, consumos);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const consumo = await this.consumoService.create(req.body);
      return sendSuccess(res, consumo, 201);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ConsumoController;
