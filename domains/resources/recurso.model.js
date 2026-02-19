
// domains/resources/recurso.model.js
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

const Recurso = {
    async create({ codigo, nombre, descripcion, tipo, unidad_medida }) {
        const result = await dbRun(
            'INSERT INTO RECURSO (codigo, nombre, descripcion, tipo, unidad_medida) VALUES (?, ?, ?, ?, ?)',
            [codigo, nombre, descripcion, tipo, unidad_medida]
        );
        return dbGet('SELECT * FROM RECURSO WHERE id = ?', [result.lastID]);
    },

    async findAll() {
        return dbAll('SELECT * FROM RECURSO ORDER BY nombre ASC');
    },

    async findById(id) {
        return dbGet('SELECT * FROM RECURSO WHERE id = ?', [id]);
    },

    async update(id, { codigo, nombre, descripcion, tipo, unidad_medida }) {
        await dbRun(
            'UPDATE RECURSO SET codigo = ?, nombre = ?, descripcion = ?, tipo = ?, unidad_medida = ? WHERE id = ?',
            [codigo, nombre, descripcion, tipo, unidad_medida, id]
        );
        return dbGet('SELECT * FROM RECURSO WHERE id = ?', [id]);
    },

    async delete(id) {
        const item = await dbGet('SELECT * FROM RECURSO WHERE id = ?', [id]);
        if (!item) return null;
        await dbRun('DELETE FROM RECURSO WHERE id = ?', [id]);
        return item;
    }
};

module.exports = Recurso;
