
// domains/quality/muestraCalidad.controller.js
const MuestraCalidad = require('./muestraCalidad.model');

/**
 * Controlador para gestionar las operaciones de MuestraCalidad.
 */
const MuestraCalidadController = {
    /**
     * Crea un nuevo registro de muestra de calidad.
     */
    async create(req, res, next) {
        try {
            const { lote_produccion_id, resultado, responsable } = req.body;
            if (!lote_produccion_id || !resultado || !responsable) {
                return res.status(400).json({ message: 'lote_produccion_id, resultado y responsable son campos requeridos.' });
            }
            const nuevaMuestra = await MuestraCalidad.create(req.body);
            res.status(201).json(nuevaMuestra);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene todas las muestras para un lote de producción específico.
     */
    async getByLoteProduccionId(req, res, next) {
        try {
            const { loteProduccionId } = req.params;
            const muestras = await MuestraCalidad.findByLoteProduccionId(loteProduccionId);
            res.status(200).json(muestras);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualiza una muestra de calidad.
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const muestraActualizada = await MuestraCalidad.update(id, req.body);
            if (!muestraActualizada) {
                return res.status(404).json({ message: 'Muestra de calidad no encontrada para actualizar.' });
            }
            res.status(200).json(muestraActualizada);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina una muestra de calidad.
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const muestraEliminada = await MuestraCalidad.delete(id);
            if (!muestraEliminada) {
                return res.status(404).json({ message: 'Muestra de calidad no encontrada para eliminar.' });
            }
            res.status(200).json({ message: 'Muestra de calidad eliminada exitosamente.', data: muestraEliminada });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = MuestraCalidadController;
