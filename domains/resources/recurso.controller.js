
// domains/resources/recurso.controller.js
const Recurso = require('./recurso.model');

/**
 * Controlador para gestionar las operaciones de Recurso.
 */
const RecursoController = {
    /**
     * Crea un nuevo recurso.
     */
    async create(req, res, next) {
        try {
            const { codigo, nombre, tipo, unidad_medida } = req.body;
            if (!codigo || !nombre || !tipo || !unidad_medida) {
                return res.status(400).json({ message: 'codigo, nombre, tipo y unidad_medida son campos requeridos.' });
            }
            const nuevoRecurso = await Recurso.create(req.body);
            res.status(201).json(nuevoRecurso);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene todos los recursos.
     */
    async getAll(req, res, next) {
        try {
            const recursos = await Recurso.findAll();
            res.status(200).json(recursos);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene un recurso por su ID.
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const recurso = await Recurso.findById(id);
            if (!recurso) {
                return res.status(404).json({ message: 'Recurso no encontrado.' });
            }
            res.status(200).json(recurso);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualiza un recurso.
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const recursoActualizado = await Recurso.update(id, req.body);
            if (!recursoActualizado) {
                return res.status(404).json({ message: 'Recurso no encontrado para actualizar.' });
            }
            res.status(200).json(recursoActualizado);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina un recurso.
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const recursoEliminado = await Recurso.delete(id);
            if (!recursoEliminado) {
                return res.status(404).json({ message: 'Recurso no encontrado para eliminar.' });
            }
            res.status(200).json({ message: 'Recurso eliminado exitosamente.', data: recursoEliminado });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = RecursoController;
