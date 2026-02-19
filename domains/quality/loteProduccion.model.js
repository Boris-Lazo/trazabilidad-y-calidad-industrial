
// domains/quality/loteProduccion.model.js
const db = require('../../config/database');

// Reutilizamos los helpers de Promesas definidos en el otro modelo
// (en una aplicación más grande, esto se movería a un archivo de utilidad)
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

const LoteProduccion = {
    async findByOrdenProduccionId(ordenProduccionId) {
        return dbAll('SELECT * FROM lotes WHERE orden_produccion_id = ?', [ordenProduccionId]);
    },

    async create({ codigo_lote, fecha_produccion, orden_produccion_id }) {
        const result = await dbRun(
            'INSERT INTO lotes (codigo_lote, fecha_produccion, orden_produccion_id) VALUES (?, ?, ?)',
            [codigo_lote, fecha_produccion, orden_produccion_id]
        );
        return dbGet('SELECT * FROM lotes WHERE id = ?', [result.id]);
    }
};

module.exports = LoteProduccion;
