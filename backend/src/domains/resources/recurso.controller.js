const recursoRepository = require('./recurso.repository');

const getAll = async (req, res, next) => {
    try {
        const recursos = await recursoRepository.findAll();
        res.json(recursos);
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const id = await recursoRepository.create(req.body);
        const recurso = await recursoRepository.findById(id);
        res.status(201).json(recurso);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAll, create };
