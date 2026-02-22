const { sendSuccess } = require('../../shared/response/responseHandler');

class QualityMuestraController {
  constructor(muestraService) {
    this.muestraService = muestraService;
  }

  getByLoteId = async (req, res, next) => {
    try {
      const muestras = await this.muestraService.getByLoteId(req.params.id);
      return sendSuccess(res, muestras);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const muestra = await this.muestraService.create(req.body);
      return sendSuccess(res, muestra, 201);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = QualityMuestraController;
