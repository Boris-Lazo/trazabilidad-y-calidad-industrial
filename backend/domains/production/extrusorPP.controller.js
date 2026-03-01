const { sendSuccess } = require('../../shared/response/responseHandler');

class ExtrusorPPController {
  constructor(extrusorPPService) {
    this.extrusorPPService = extrusorPPService;
  }

  guardarDetalle = async (req, res, next) => {
    try {
      const usuario = req.user.username;
      const data = req.body;
      const result = await this.extrusorPPService.saveDetalle(data, usuario);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  getDetalle = async (req, res, next) => {
    try {
      const { bitacoraId } = req.params;
      const result = await this.extrusorPPService.getDetalle(bitacoraId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = ExtrusorPPController;
