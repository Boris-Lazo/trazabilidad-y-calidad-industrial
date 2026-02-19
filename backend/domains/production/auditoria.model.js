
const db = require('../../config/database');

const Auditoria = {
    findByEntity: (entidad, entidadId, callback) => {
        const query = `SELECT * FROM auditoria WHERE entidad = ? AND entidad_id = ? ORDER BY fecha_hora DESC`;
        db.all(query, [entidad, entidadId], (err, rows) => {
            callback(err, rows);
        });
    }
};

module.exports = Auditoria;
