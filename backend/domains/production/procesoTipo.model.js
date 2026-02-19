
// domains/production/procesoTipo.model.js
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
        err ? reject(err) : resolve({ changes: this.changes, lastID: this.lastID });
    });
});


const ProcesoTipo = {
    async create({ nombre, unidad_produccion, reporta_merma_kg }) {
        const result = await dbRun(
            'INSERT INTO PROCESO_TIPO (nombre, unidad_produccion, reporta_merma_kg) VALUES (?, ?, ?)',
            [nombre, unidad_produccion, reporta_merma_kg]
        );
        return dbGet('SELECT * FROM PROCESO_TIPO WHERE id = ?', [result.lastID]);
    },

    async findAll() {
        return dbAll('SELECT * FROM PROCESO_TIPO ORDER BY id ASC');
    },

    async findById(id) {
        return dbGet('SELECT * FROM PROCESO_TIPO WHERE id = ?', [id]);
    },

    async update(id, { nombre, unidad_produccion, reporta_merma_kg, activo }) {
         await dbRun(
            'UPDATE PROCESO_TIPO SET nombre = ?, unidad_produccion = ?, reporta_merma_kg = ?, activo = ? WHERE id = ?',
            [nombre, unidad_produccion, reporta_merma_kg, activo, id]
        );
        return dbGet('SELECT * FROM PROCESO_TIPO WHERE id = ?', [id]);
    },

    async delete(id) {
        const item = await dbGet('SELECT * FROM PROCESO_TIPO WHERE id = ?', [id]);
        if (!item) return null;
        await dbRun('DELETE FROM PROCESO_TIPO WHERE id = ?', [id]);
        return item;
    }
};

module.exports = ProcesoTipo;
