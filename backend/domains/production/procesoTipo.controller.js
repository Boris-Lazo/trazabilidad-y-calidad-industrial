// Controlador para tipos de procesos
const { sendSuccess } = require('../../shared/response/responseHandler');

class ProcesoTipoController {
  /**
   * @param {ProcesoTipoService} procesoTipoService
   */
  constructor(procesoTipoService) {
    this.procesoTipoService = procesoTipoService;
  }

  getAll = async (req, res, next) => {
    try {
      const procesos = await this.procesoTipoService.getAllActive();
      return sendSuccess(res, procesos);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ProcesoTipoController;
