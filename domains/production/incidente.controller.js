
const Incidente = require('./incidente.model');

const IncidenteController = {
    async getAll(req, res, next) {
        try {
            const incidentes = await Incidente.findAll();
            res.status(200).json(incidentes);
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const nuevo = await Incidente.create(req.body);
            res.status(201).json(nuevo);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const actualizado = await Incidente.update(id, req.body);
            res.status(200).json(actualizado);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = IncidenteController;
