const loteRepository = require('./lote.repository');

const getByOrdenId = async (req, res, next) => {
    try {
        const lotes = await loteRepository.findByOrdenId(req.params.id);
        res.json(lotes);
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const id = await loteRepository.create(req.body);
        const lote = await sqlite.get('SELECT * FROM lotes WHERE id = ?', [id]); // Quick fix or add findById to repo
        res.status(201).json(lote);
    } catch (error) {
        next(error);
    }
};

module.exports = { getByOrdenId, create };
