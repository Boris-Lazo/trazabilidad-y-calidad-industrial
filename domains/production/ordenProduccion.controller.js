
// domains/production/ordenProduccion.controller.js
const OrdenProduccion = require('./ordenProduccion.model');

/**
 * Controlador para gestionar las operaciones CRUD de OrdenProduccion.
 */
const OrdenProduccionController = {
    /**
     * Crea una nueva orden de producción.
     */
    async create(req, res, next) {
        try {
            const nuevaOrden = await OrdenProduccion.create(req.body);
            res.status(201).json(nuevaOrden);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene todas las órdenes de producción.
     */
    async getAll(req, res, next) {
        try {
            const ordenes = await OrdenProduccion.findAll();
            res.status(200).json(ordenes);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene una orden de producción por su ID.
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const orden = await OrdenProduccion.findById(id);
            if (!orden) {
                return res.status(404).json({ message: 'Orden de producción no encontrada' });
            }
            res.status(200).json(orden);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualiza una orden de producción existente.
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const ordenActualizada = await OrdenProduccion.update(id, req.body);
            if (!ordenActualizada) {
                return res.status(404).json({ message: 'Orden de producción no encontrada para actualizar' });
            }
            res.status(200).json(ordenActualizada);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina una orden de producción.
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const ordenEliminada = await OrdenProduccion.delete(id);
            if (!ordenEliminada) {
                return res.status(404).json({ message: 'Orden de producción no encontrada para eliminar' });
            }
            res.status(200).json({ message: 'Orden de producción eliminada exitosamente', data: ordenEliminada });
        } catch (error) {
            // Si el error viene del modelo con un mensaje específico (ej. restricción de FK)
            if (error.message.includes('líneas de ejecución asociadas')) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    }
};

module.exports = OrdenProduccionController;
