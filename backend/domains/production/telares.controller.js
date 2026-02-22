
const { sendSuccess } = require('../../shared/response/responseHandler');

class TelaresController {
  constructor(telaresService) {
    this.telaresService = telaresService;
  }

  getResumen = async (req, res, next) => {
    try {
      const { bitacora_id } = req.query;
      if (!bitacora_id) throw new Error('bitacora_id is required');
      const resumen = await this.telaresService.getResumen(bitacora_id);
      return sendSuccess(res, resumen);
    } catch (error) {
      next(error);
    }
  };

  getDetalle = async (req, res, next) => {
    try {
      const { maquinaId } = req.params;
      const { bitacora_id } = req.query;
      if (!bitacora_id) throw new Error('bitacora_id is required');
      const detalle = await this.telaresService.getDetalle(bitacora_id, maquinaId);
      return sendSuccess(res, detalle);
    } catch (error) {
      next(error);
    }
  };

  guardarDetalle = async (req, res, next) => {
    try {
      const usuario = req.user.nombre || req.user.username;
      await this.telaresService.saveDetalle(req.body, usuario);
      return sendSuccess(res, { message: 'Datos del telar guardados correctamente' });
    } catch (error) {
      next(error);
    }
  };

  getParoTipos = async (req, res, next) => {
    try {
        const tipos = await this.telaresService.telaresRepository.getParoTipos();
        return sendSuccess(res, tipos);
    } catch (error) {
        next(error);
    }
  }
}

module.exports = TelaresController;
