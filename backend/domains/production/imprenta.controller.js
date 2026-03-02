const { sendSuccess } = require('../../shared/response/responseHandler');
const ValidationError = require('../../shared/errors/ValidationError');

class ImprentaController {
  constructor(imprentaService) {
    this.imprentaService = imprentaService;
  }

  getDetalle = async (req, res, next) => {
    try {
      const { maquinaId } = req.params;
      const { bitacora_id } = req.query;
      if (!bitacora_id) throw new ValidationError('bitacora_id is required');

      const detalle = await this.imprentaService.getDetalle(bitacora_id);
      return sendSuccess(res, detalle);
    } catch (error) {
      next(error);
    }
  };

  guardarDetalle = async (req, res, next) => {
    try {
      const usuario = req.user.nombre || req.user.username;
      const result = await this.imprentaService.saveDetalle(req.body, usuario);
      return sendSuccess(res, {
          message: 'Datos de imprenta guardados correctamente',
          ...result
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ImprentaController;
