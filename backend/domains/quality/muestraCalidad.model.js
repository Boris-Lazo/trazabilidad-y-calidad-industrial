
// domains/quality/muestraCalidad.model.js
const db = require('../../config/database');

// Helpers de Promesas (idealmente en un archivo de utilidades)
const dbAll = (query, params) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
};

const dbGet = (query, params) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
};

const dbRun = (query, params) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err); else resolve({ id: this.lastID });
        });
    });
};

const MuestraCalidad = {
    async findByLoteId(loteId) {
        return dbAll('SELECT * FROM muestras WHERE lote_id = ?', [loteId]);
    },

    async create({ codigo_muestra, fecha_analisis, lote_id }) {
        const result = await dbRun(
            'INSERT INTO muestras (codigo_muestra, fecha_analisis, lote_id) VALUES (?, ?, ?)',
            [codigo_muestra, fecha_analisis, lote_id]
        );
        return dbGet('SELECT * FROM muestras WHERE id = ?', [result.id]);
    }
};

module.exports = MuestraCalidad;
