const { sendSuccess } = require('../../shared/response/responseHandler');
const ValidationError = require('../../shared/errors/ValidationError');

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

  getActivos = async (req, res, next) => {
    try {
      const lotes = await this.loteService.getActivos();
      return sendSuccess(res, lotes);
    } catch (error) {
      next(error);
    }
  };

  getConsumoTelar = async (req, res, next) => {
    try {
      const { maquina_id, bitacora_id } = req.query;
      if (!maquina_id || !bitacora_id) {
          throw new ValidationError('Parámetros maquina_id y bitacora_id son obligatorios.');
      }
      const consumos = await this.loteService.getConsumoTelar(maquina_id, bitacora_id);
      return sendSuccess(res, consumos);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = LoteController;
