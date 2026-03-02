const { sendSuccess } = require('../../shared/response/responseHandler');
const ValidationError = require('../../shared/errors/ValidationError');

class LaminadoController {
  constructor(laminadoService) {
    this.laminadoService = laminadoService;
  }

  getDetalle = async (req, res, next) => {
    try {
      const { maquinaId } = req.params;
      const { bitacora_id } = req.query;
      if (!bitacora_id) throw new ValidationError('bitacora_id is required');

      // El service actualmente ignora el maquinaId porque hay una sola máquina,
      // pero el repositorio lo busca por proceso_id = 3.
      // Si en el futuro hubiera más, el service debería recibir maquinaId.
      const detalle = await this.laminadoService.getDetalle(bitacora_id);
      return sendSuccess(res, detalle);
    } catch (error) {
      next(error);
    }
  };

  guardarDetalle = async (req, res, next) => {
    try {
      const usuario = req.user.nombre || req.user.username;
      const result = await this.laminadoService.saveDetalle(req.body, usuario);
      return sendSuccess(res, {
          message: 'Datos de laminado guardados correctamente',
          ...result
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = LaminadoController;
