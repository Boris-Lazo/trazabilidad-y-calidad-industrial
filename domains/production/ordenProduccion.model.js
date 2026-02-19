
// domains/production/ordenProduccion.model.js
const db = require('../../config/database');

// Helper para usar Promises con db.all
const dbAll = (query, params) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error running query:', query);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Helper para usar Promises con db.get
const dbGet = (query, params) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                console.error('Error running query:', query);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Helper para usar Promises con db.run
const dbRun = (query, params) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                console.error('Error running query:', query);
                reject(err);
            } else {
                // Devuelve el ID de la última fila insertada
                resolve({ id: this.lastID });
            }
        });
    });
};

const OrdenProduccion = {
    async findAll() {
        return dbAll('SELECT * FROM orden_produccion ORDER BY id ASC');
    },

    async findById(id) {
        return dbGet('SELECT * FROM orden_produccion WHERE id = ?', [id]);
    },

    async create({ codigo_orden, fecha_creacion }) {
        const result = await dbRun(
            'INSERT INTO orden_produccion (codigo_orden, fecha_creacion) VALUES (?, ?)',
            [codigo_orden, fecha_creacion]
        );
        return dbGet('SELECT * FROM orden_produccion WHERE id = ?', [result.id]);
    }
};

module.exports = OrdenProduccion;
