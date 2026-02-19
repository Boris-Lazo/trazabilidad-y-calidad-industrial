
// domains/production/registroTrabajo.controller.js
const RegistroTrabajo = require('./registroTrabajo.model');
const Auditoria = require('./auditoria.model');

/**
 * Controlador para gestionar las operaciones de RegistroTrabajo.
 */
const RegistroTrabajoController = {
    /**
     * Crea un nuevo registro de trabajo.
     */
    async create(req, res, next) {
        try {
            const { linea_ejecucion_id, bitacora_id, cantidad_producida, merma_kg, parametros, observaciones, fecha_hora, estado } = req.body;

            const nuevoRegistro = await RegistroTrabajo.create({
                linea_ejecucion_id,
                bitacora_id,
                cantidad_producida,
                merma_kg,
                parametros,
                observaciones,
                fecha_hora,
                estado
            });
            res.status(201).json(nuevoRegistro);
        } catch (error) {
            next(error);
        }
    },

    async getHistory(req, res, next) {
        try {
            const { id } = req.params;
            Auditoria.findByEntity('registros_trabajo', id, (err, history) => {
                if (err) return next(err);
                res.status(200).json(history);
            });
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
            const registros = await RegistroTrabajo.findByLineaEjecucionId(lineaId);
            if (!registros) {
                return res.status(404).json({ message: 'No se encontraron registros para esta línea de ejecución.' });
            }
            res.status(200).json(registros);
        } catch (error) {
            next(error);
        }
    },

    async getByBitacoraAndProceso(req, res, next) {
        try {
            const { bitacoraId, procesoId } = req.query;
            const registro = await RegistroTrabajo.findByBitacoraAndProceso(bitacoraId, procesoId);
            res.status(200).json(registro || null);
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
            const { motivo, ...updatedData } = req.body;

            if (!motivo) {
                return res.status(400).json({ message: 'El motivo de la corrección es obligatorio.' });
            }

            const registroActualizado = await RegistroTrabajo.update(id, updatedData);

            if (!registroActualizado) {
                return res.status(404).json({ message: 'Registro de trabajo no encontrado para actualizar.' });
            }

            // Log de auditoría
            const db = require('../../config/database');
            db.run('INSERT INTO auditoria (usuario, accion, entidad, entidad_id, detalles) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'UPDATE_CORRECTION', 'registros_trabajo', id, `Motivo: ${motivo}`]
            );

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
