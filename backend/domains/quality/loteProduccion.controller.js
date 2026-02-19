
// domains/quality/loteProduccion.controller.js
const LoteProduccion = require('./loteProduccion.model');

/**
 * Controlador para gestionar las operaciones de LoteProduccion.
 */
const LoteProduccionController = {
    /**
     * Crea un nuevo lote de producción.
     */
    async create(req, res, next) {
        try {
            const { orden_produccion_id, codigo_lote, cantidad_producida } = req.body;
            if (!orden_produccion_id || !codigo_lote || cantidad_producida === undefined) {
                return res.status(400).json({ message: 'orden_produccion_id, codigo_lote y cantidad_producida son campos requeridos.' });
            }
            const nuevoLote = await LoteProduccion.create(req.body);
            res.status(201).json(nuevoLote);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene todos los lotes para una orden de producción específica.
     */
    async getByOrdenProduccionId(req, res, next) {
        try {
            const { ordenProduccionId } = req.params;
            const lotes = await LoteProduccion.findByOrdenProduccionId(ordenProduccionId);
            res.status(200).json(lotes);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualiza un lote de producción.
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const loteActualizado = await LoteProduccion.update(id, req.body);
            if (!loteActualizado) {
                return res.status(404).json({ message: 'Lote de producción no encontrado para actualizar.' });
            }
            res.status(200).json(loteActualizado);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina un lote de producción.
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const loteEliminado = await LoteProduccion.delete(id);
            if (!loteEliminado) {
                return res.status(404).json({ message: 'Lote de producción no encontrado para eliminar.' });
            }
            res.status(200).json({ message: 'Lote de producción eliminado exitosamente.', data: loteEliminado });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = LoteProduccionController;
