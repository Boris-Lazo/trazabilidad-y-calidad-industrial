
// domains/resources/consumo.controller.js
const Consumo = require('./consumo.model');

/**
 * Controlador para gestionar las operaciones de Consumo.
 */
const ConsumoController = {
    /**
     * Crea un nuevo registro de consumo.
     */
    async create(req, res, next) {
        try {
            const { registro_trabajo_id, recurso_id, cantidad_consumida } = req.body;
            if (!registro_trabajo_id || !recurso_id || cantidad_consumida === undefined) {
                return res.status(400).json({ message: 'registro_trabajo_id, recurso_id y cantidad_consumida son campos requeridos.' });
            }
            const nuevoConsumo = await Consumo.create(req.body);
            res.status(201).json(nuevoConsumo);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene todos los consumos para un registro de trabajo específico.
     */
    async getByRegistroTrabajoId(req, res, next) {
        try {
            const { registroTrabajoId } = req.params;
            const consumos = await Consumo.findByRegistroTrabajoId(registroTrabajoId);
            res.status(200).json(consumos);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualiza un registro de consumo.
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const consumoActualizado = await Consumo.update(id, req.body);
            if (!consumoActualizado) {
                return res.status(404).json({ message: 'Consumo no encontrado para actualizar.' });
            }
            res.status(200).json(consumoActualizado);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina un registro de consumo.
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const consumoEliminado = await Consumo.delete(id);
            if (!consumoEliminado) {
                return res.status(404).json({ message: 'Consumo no encontrado para eliminar.' });
            }
            res.status(200).json({ message: 'Consumo eliminado exitosamente.', data: consumoEliminado });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = ConsumoController;
