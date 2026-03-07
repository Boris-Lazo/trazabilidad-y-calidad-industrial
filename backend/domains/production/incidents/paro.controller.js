const { sendSuccess } = require('../../../shared/response/responseHandler');

class ParoController {
  /**
   * @param {ParoService} paroService
   */
  constructor(paroService) {
    this.paroService = paroService;
  }

  getParosByProceso = async (req, res, next) => {
    try {
      const { bitacora_id, proceso_id } = req.query;
      const paros = await this.paroService.getParosByProceso(bitacora_id, proceso_id);
      return sendSuccess(res, paros);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const paro = await this.paroService.create(req.body);
      return sendSuccess(res, paro, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const paro = await this.paroService.update(id, req.body);
      return sendSuccess(res, paro);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      await this.paroService.delete(id);
      return sendSuccess(res, { message: 'Paro eliminado correctamente.' });
    } catch (error) {
      next(error);
    }
  };

  getMotivos = async (req, res, next) => {
    try {
      const motivos = await this.paroService.getMotivos();
      return sendSuccess(res, motivos);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ParoController;
