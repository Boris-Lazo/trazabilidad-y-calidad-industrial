// Controlador para órdenes de producción
const { sendSuccess } = require('../../../shared/response/responseHandler');
const NotFoundError = require('../../../shared/errors/NotFoundError');

class OrdenProduccionController {
  /**
   * @param {OrdenProduccionService} ordenProduccionService
   */
  constructor(ordenProduccionService) {
    this.ordenProduccionService = ordenProduccionService;
  }

  getAll = async (req, res, next) => {
    try {
      const filters = {
          estado: req.query.estado,
          proceso_prefix: req.query.proceso_id || req.query.proceso_prefix
      };
      const ordenes = await this.ordenProduccionService.getAll(filters);
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

  getTraceability = async (req, res, next) => {
    try {
        const trazabilidad = await this.ordenProduccionService.getTraceability(req.params.id);
        return sendSuccess(res, trazabilidad);
    } catch (error) {
        next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const usuario = req.user ? req.user.username : 'SISTEMA';
      const orden = await this.ordenProduccionService.create(req.body, usuario);
      return sendSuccess(res, orden, 201);
    } catch (error) {
      next(error);
    }
  };

  crearEmergencia = async (req, res, next) => {
    try {
      const usuario = req.user ? req.user.username : 'SISTEMA';
      const orden = await this.ordenProduccionService.crearEmergencia(req.body, usuario);
      return sendSuccess(res, orden, 201);
    } catch (error) {
      next(error);
    }
  };

  vincularEmergencia = async (req, res, next) => {
    try {
      const usuario = req.user ? req.user.username : 'SISTEMA';
      const orden = await this.ordenProduccionService.vincularEmergenciaASAP(
          req.params.id, req.body.codigo_sap, usuario
      );
      return sendSuccess(res, orden);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
      try {
          const usuario = req.user ? req.user.username : 'SISTEMA';
          const orden = await this.ordenProduccionService.update(req.params.id, req.body, usuario);
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
