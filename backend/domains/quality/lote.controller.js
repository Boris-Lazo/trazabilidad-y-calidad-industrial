const { sendSuccess } = require('../../shared/response/responseHandler');
const ValidationError = require('../../shared/errors/ValidationError');

class LoteController {
  constructor(loteService) {
    this.loteService = loteService;
  }

  getAll = async (req, res, next) => {
    try {
      const lotes = await this.loteService.getDisponibles();
      return sendSuccess(res, lotes);
    } catch (error) {
      next(error);
    }
  };

  getByOrdenId = async (req, res, next) => {
    try {
      const lotes = await this.loteService.getByOrdenId(req.params.id);
      return sendSuccess(res, lotes);
    } catch (error) {
      next(error);
    }
  };

  getDisponibles = async (req, res, next) => {
    try {
      const lotes = await this.loteService.getDisponibles();
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

  cambiarEstado = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { estado, comentario } = req.body;
      if (!estado) throw new ValidationError('El campo estado es obligatorio.');
      const usuario = req.user.nombre || req.user.username;
      const lote = await this.loteService.cambiarEstado(id, estado, comentario, usuario);
      return sendSuccess(res, lote);
    } catch (error) {
      next(error);
    }
  };

  getHistorialEstado = async (req, res, next) => {
    try {
      const historial = await this.loteService.getHistorialEstado(req.params.id);
      return sendSuccess(res, historial);
    } catch (error) {
      next(error);
    }
  };

  getTrazabilidad = async (req, res, next) => {
    try {
      const data = await this.loteService.getTrazabilidad(req.params.id);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = LoteController;
