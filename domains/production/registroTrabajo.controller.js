
// domains/production/registroTrabajo.controller.js
const RegistroTrabajo = require('./registroTrabajo.model');

/**
 * Controlador para gestionar las operaciones de RegistroTrabajo.
 */
const RegistroTrabajoController = {
    /**
     * Crea un nuevo registro de trabajo.
     */
    async create(req, res, next) {
        try {
            const { linea_id, operador_id, cantidad_producida, cantidad_merma, inicio_trabajo, fin_trabajo, estado } = req.body;
            if (linea_id === undefined || cantidad_producida === undefined) {
                return res.status(400).json({ message: 'linea_id y cantidad_producida son campos requeridos.' });
            }
            const nuevoRegistro = await RegistroTrabajo.create({ linea_id, operador_id, cantidad_producida, cantidad_merma, inicio_trabajo, fin_trabajo, estado });
            res.status(201).json(nuevoRegistro);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtiene todos los registros de trabajo para una línea de ejecución específica.
     */
    async getByLineaId(req, res, next) {
        try {
            const { lineaId } = req.params;
            const registros = await RegistroTrabajo.findByLineaId(lineaId);
            if (!registros) {
                return res.status(404).json({ message: 'No se encontraron registros para esta línea de ejecución.' });
            }
            res.status(200).json(registros);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualiza un registro de trabajo.
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updatedData = req.body;

            const registroActualizado = await RegistroTrabajo.update(id, updatedData);

            if (!registroActualizado) {
                return res.status(404).json({ message: 'Registro de trabajo no encontrado para actualizar.' });
            }

            res.status(200).json(registroActualizado);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Elimina un registro de trabajo.
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const registroEliminado = await RegistroTrabajo.delete(id);
            if (!registroEliminado) {
                return res.status(404).json({ message: 'Registro de trabajo no encontrado para eliminar.' });
            }
            res.status(200).json({ message: 'Registro de trabajo eliminado exitosamente.', data: registroEliminado });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = RegistroTrabajoController;
