
// domains/production/procesoTipo.controller.js
const ProcesoTipo = require('./procesoTipo.model');

/**
 * Controlador para gestionar las operaciones CRUD de ProcesoTipo.
 */
const ProcesoTipoController = {
    /**
     * Crea un nuevo tipo de proceso.
     * @param {object} req - Objeto de solicitud de Express.
     * @param {object} res - Objeto de respuesta de Express.
     * @param {function} next - Función para pasar al siguiente middleware.
     */
    async create(req, res, next) {
        try {
            const nuevoProceso = await ProcesoTipo.create(req.body);
            res.status(201).json(nuevoProceso);
        } catch (error) {
            next(error); // Pasa el error al manejador central
        }
    },

    /**
     * Obtiene todos los tipos de proceso.
     */
    async getAll(req, res, next) {
        try {
            const procesos = await ProcesoTipo.findAll();
            res.status(200).json(procesos);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene un tipo de proceso por su ID.
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const proceso = await ProcesoTipo.findById(id);
            if (!proceso) {
                return res.status(404).json({ message: 'Proceso no encontrado' });
            }
            res.status(200).json(proceso);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualiza un tipo de proceso existente.
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const procesoActualizado = await ProcesoTipo.update(id, req.body);
            if (!procesoActualizado) {
                return res.status(404).json({ message: 'Proceso no encontrado para actualizar' });
            }
            res.status(200).json(procesoActualizado);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina un tipo de proceso.
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const procesoEliminado = await ProcesoTipo.delete(id);
            if (!procesoEliminado) {
                return res.status(404).json({ message: 'Proceso no encontrado para eliminar' });
            }
            res.status(200).json({ message: 'Proceso eliminado exitosamente', data: procesoEliminado });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = ProcesoTipoController;
