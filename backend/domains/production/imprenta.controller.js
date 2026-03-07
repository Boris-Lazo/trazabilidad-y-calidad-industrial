const { sendSuccess } = require('../../shared/response/responseHandler');

class ImprentaController {
  constructor(imprentaService) {
    this.imprentaService = imprentaService;
  }

  guardarDetalle = async (req, res, next) => {
    try {
      const usuario = req.user.nombre || req.user.username;
      const data = req.body;
      const result = await this.imprentaService.saveDetalle(data, usuario);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  getDetalle = async (req, res, next) => {
    try {
      const { bitacora_id } = req.query;
      // maquinaId viene en params por retrocompatibilidad
      const result = await this.imprentaService.getDetalle(bitacora_id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = ImprentaController;
