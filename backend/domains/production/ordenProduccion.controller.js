// Controlador para órdenes de producción
const ordenProduccionService = require('./ordenProduccion.service');

const getAll = async (req, res, next) => {
  try {
    const ordenes = await ordenProduccionService.getAll();
    res.json(ordenes);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
    try {
        const orden = await ordenProduccionService.getById(req.params.id);
        if (!orden) return res.status(404).json({ message: 'Orden no encontrada' });
        res.json(orden);
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
  try {
    const orden = await ordenProduccionService.create(req.body);
    res.status(201).json(orden);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
    try {
        const orden = await ordenProduccionService.update(req.params.id, req.body);
        res.json(orden);
    } catch (error) {
        next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        await ordenProduccionService.remove(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
