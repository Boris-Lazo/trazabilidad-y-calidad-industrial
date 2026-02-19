
// domains/production/registroTrabajo.model.js
const db = require('../../config/database');

// Helpers de Promesas
const dbAll = (query, params) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbGet = (query, params) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbRun = (query, params) => new Promise((resolve, reject) => {
    db.run(query, params, function (err) { 
        err ? reject(err) : resolve({ lastID: this.lastID });
    });
});

const RegistroTrabajo = {
    async findByLineaEjecucionId(lineaId) {
        return dbAll('SELECT * FROM registros_trabajo WHERE linea_ejecucion_id = ?', [lineaId]);
    },

    async create({ linea_ejecucion_id, cantidad_producida, fecha_hora }) {
        const result = await dbRun(
            'INSERT INTO registros_trabajo (linea_ejecucion_id, cantidad_producida, fecha_hora) VALUES (?, ?, ?)',
            [linea_ejecucion_id, cantidad_producida, fecha_hora]
        );
        return dbGet('SELECT * FROM registros_trabajo WHERE id = ?', [result.lastID]);
    }
};

module.exports = RegistroTrabajo;
