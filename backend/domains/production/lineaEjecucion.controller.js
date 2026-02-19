
// domains/production/lineaEjecucion.controller.js
const LineaEjecucion = require('./lineaEjecucion.model');

/**
 * Controlador para gestionar las operaciones de LineaEjecucion.
 */
const LineaEjecucionController = {
    /**
     * Obtiene todas las líneas de ejecución.
     */
    async getAll(req, res, next) {
        try {
            const lineas = await LineaEjecucion.findAll();
            res.status(200).json(lineas);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Crea una nueva línea de ejecución.
     */
    async create(req, res, next) {
        try {
            // Validar que el orden_id venga en el cuerpo de la petición
            const { orden_id, proceso_id } = req.body;
            if (!orden_id || !proceso_id) {
                return res.status(400).json({ message: 'orden_id and proceso_id son requeridos' });
            }
            const nuevaLinea = await LineaEjecucion.create({ orden_id, proceso_id });
            res.status(201).json(nuevaLinea);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene todas las líneas de ejecución para una orden de producción específica.
     * El ID de la orden se toma de los parámetros de la ruta.
     */
    async getByOrderId(req, res, next) {
        try {
            const { ordenId } = req.params;
            const lineas = await LineaEjecucion.findByOrderId(ordenId);
            if (!lineas) {
                return res.status(404).json({ message: 'No se encontraron líneas para esta orden de producción' });
            }
            res.status(200).json(lineas);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualiza el estado de una línea de ejecución específica.
     * El ID de la línea se toma de los parámetros de la ruta.
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!estado) {
                return res.status(400).json({ message: 'El campo estado es requerido para actualizar' });
            }

            const lineaActualizada = await LineaEjecucion.update(id, { estado });
            if (!lineaActualizada) {
                return res.status(404).json({ message: 'Línea de ejecución no encontrada para actualizar' });
            }
            res.status(200).json(lineaActualizada);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina una línea de ejecución.
     * El ID de la línea se toma de los parámetros de la ruta.
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const lineaEliminada = await LineaEjecucion.delete(id);
            if (!lineaEliminada) {
                return res.status(404).json({ message: 'Línea de ejecución no encontrada para eliminar' });
            }
            res.status(200).json({ message: 'Línea de ejecución eliminada exitosamente', data: lineaEliminada });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = LineaEjecucionController;
