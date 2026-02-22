// Controlador para órdenes de producción
const { sendSuccess } = require('../../shared/response/responseHandler');
const NotFoundError = require('../../shared/errors/NotFoundError');

class OrdenProduccionController {
  /**
   * @param {OrdenProduccionService} ordenProduccionService
   */
  constructor(ordenProduccionService) {
    this.ordenProduccionService = ordenProduccionService;
  }

  getAll = async (req, res, next) => {
    try {
      const ordenes = await this.ordenProduccionService.getAll();
      return sendSuccess(res, ordenes);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
      try {
          const orden = await this.ordenProduccionService.getById(req.params.id);
          if (!orden) throw new NotFoundError('Orden no encontrada');
          return sendSuccess(res, orden);
      } catch (error) {
          next(error);
      }
  };

  create = async (req, res, next) => {
    try {
      const orden = await this.ordenProduccionService.create(req.body);
      return sendSuccess(res, orden, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
      try {
          const orden = await this.ordenProduccionService.update(req.params.id, req.body);
          return sendSuccess(res, orden);
      } catch (error) {
          next(error);
      }
  };

  remove = async (req, res, next) => {
      try {
          await this.ordenProduccionService.remove(req.params.id);
          return sendSuccess(res, null, 204);
      } catch (error) {
          next(error);
      }
  };
}

module.exports = OrdenProduccionController;
