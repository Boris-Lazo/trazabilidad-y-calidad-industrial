const consumoRepository = require('./consumo.repository');

const getByRegistroId = async (req, res, next) => {
    try {
        const consumos = await consumoRepository.findByRegistroId(req.params.id);
        res.json(consumos);
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const id = await consumoRepository.create(req.body);
        const consumo = await sqlite.get('SELECT * FROM CONSUMO WHERE id = ?', [id]); // Quick fix or add findById to repo
        res.status(201).json(consumo);
    } catch (error) {
        next(error);
    }
};

module.exports = { getByRegistroId, create };
