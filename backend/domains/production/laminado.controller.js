const { sendSuccess } = require('../../shared/response/responseHandler');

class LaminadoController {
  constructor(laminadoService) {
    this.laminadoService = laminadoService;
  }

  guardarDetalle = async (req, res, next) => {
    try {
      const usuario = req.user.nombre || req.user.username;
      const data = req.body;
      const result = await this.laminadoService.saveDetalle(data, usuario);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  };

  getDetalle = async (req, res, next) => {
    try {
      const { bitacora_id } = req.query;
      const result = await this.laminadoService.getDetalle(bitacora_id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  uploadPdf = async (req, res, next) => {
    try {
      const usuario = req.user.nombre || req.user.username;
      const { tipo, marca, lote_material, pdf_base64, pdf_nombre } = req.body;
      const result = await this.laminadoService.uploadPdf(
          tipo, marca, lote_material, pdf_base64, pdf_nombre, usuario
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = LaminadoController;
