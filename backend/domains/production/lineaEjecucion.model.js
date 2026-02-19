
// domains/production/lineaEjecucion.model.js
const db = require('../../config/database');

// Helpers (en un proyecto real, esto estaría en un archivo de utilidad compartido)
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

const LineaEjecucion = {
    async findAll() {
        return dbAll('SELECT * FROM lineas_ejecucion');
    },

    async findByOrdenProduccionId(ordenProduccionId) {
        return dbAll('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ?', [ordenProduccionId]);
    },

    async create({ orden_produccion_id, proceso_tipo_id, estado }) {
        const result = await dbRun(
            'INSERT INTO lineas_ejecucion (orden_produccion_id, proceso_tipo_id, estado) VALUES (?, ?, ?)',
            [orden_produccion_id, proceso_tipo_id, estado]
        );
        return dbGet('SELECT * FROM lineas_ejecucion WHERE id = ?', [result.id]);
    }
};

module.exports = LineaEjecucion;
