const muestraRepository = require('./muestra.repository');

const getByLoteId = async (req, res, next) => {
    try {
        const muestras = await muestraRepository.findByLoteId(req.params.id);
        res.json(muestras);
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const id = await muestraRepository.create(req.body);
        const muestra = await muestraRepository.findById(id);
        res.status(201).json(muestra);
    } catch (error) {
        next(error);
    }
};

module.exports = { getByLoteId, create };
