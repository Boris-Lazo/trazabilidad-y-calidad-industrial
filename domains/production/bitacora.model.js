
const db = require('../../config/database');

const Bitacora = {
    create: (data, callback) => {
        const query = `INSERT INTO bitacora_turno (fecha_operativa, turno, usuario_id) VALUES (?, ?, ?)`;
        db.run(query, [data.fecha_operativa, data.turno, data.usuario_id], function(err) {
            callback(err, this ? this.lastID : null);
        });
    },

    findById: (id, callback) => {
        const query = `SELECT * FROM bitacora_turno WHERE id = ?`;
        db.get(query, [id], (err, row) => {
            callback(err, row);
        });
    },

    findCurrent: (callback) => {
        // Encontrar la bitácora abierta más reciente
        const query = `SELECT * FROM bitacora_turno WHERE estado = 'en_curso' ORDER BY fecha_apertura DESC LIMIT 1`;
        db.get(query, [], (err, row) => {
            callback(err, row);
        });
    },

    close: (id, resumen, callback) => {
        const query = `UPDATE bitacora_turno SET estado = 'cerrado', fecha_cierre = CURRENT_TIMESTAMP, resumen_cierre = ? WHERE id = ?`;
        db.run(query, [resumen, id], function(err) {
            callback(err);
        });
    },

    getProcessStatus: (bitacoraId, callback) => {
        // Esta consulta es más compleja, necesita ver si hay registros para cada tipo de proceso en esta bitácora
        const query = `
            SELECT
                pt.id,
                pt.nombre,
                (SELECT COUNT(*) FROM registros_trabajo rt
                 JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
                 WHERE le.proceso_tipo_id = pt.id AND rt.bitacora_id = ?) as num_registros
            FROM PROCESO_TIPO pt
            WHERE pt.activo = 1
        `;
        db.all(query, [bitacoraId], (err, rows) => {
            callback(err, rows);
        });
    },

    getSummaryStats: (bitacoraId, callback) => {
        const query = `
            SELECT
                COUNT(*) as total_registros,
                SUM(merma_kg) as total_merma,
                (SELECT COUNT(*) FROM muestras WHERE bitacora_id = ?) as total_muestras
            FROM registros_trabajo
            WHERE bitacora_id = ?
        `;
        db.get(query, [bitacoraId, bitacoraId], (err, row) => {
            callback(err, row);
        });
    }
};

module.exports = Bitacora;
