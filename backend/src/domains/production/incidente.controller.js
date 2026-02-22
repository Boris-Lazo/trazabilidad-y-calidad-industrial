const incidenteRepository = require('./incidente.repository');

const getAll = async (req, res, next) => {
  try {
    const incidentes = await incidenteRepository.findAll();
    res.json(incidentes);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
    try {
        const id = await incidenteRepository.create(req.body);
        const incidente = await incidenteRepository.findById(id);
        res.status(201).json(incidente);
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        await incidenteRepository.update(req.params.id, req.body);
        const incidente = await incidenteRepository.findById(req.params.id);
        res.json(incidente);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAll, create, update };
