
// domains/resources/consumo.model.js
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

const Consumo = {
    async create({ registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo }) {
        const result = await dbRun(
            'INSERT INTO CONSUMO (registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo) VALUES (?, ?, ?, ?)',
            [registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo]
        );
        return dbGet('SELECT * FROM CONSUMO WHERE id = ?', [result.lastID]);
    },

    async findByRegistroTrabajoId(registroTrabajoId) {
        return dbAll('SELECT * FROM CONSUMO WHERE registro_trabajo_id = ? ORDER BY timestamp_consumo DESC', [registroTrabajoId]);
    },

    async findById(id) {
        return dbGet('SELECT * FROM CONSUMO WHERE id = ?', [id]);
    },

    async update(id, { recurso_id, cantidad_consumida, timestamp_consumo }) {
        await dbRun(
            'UPDATE CONSUMO SET recurso_id = ?, cantidad_consumida = ?, timestamp_consumo = ? WHERE id = ?',
            [recurso_id, cantidad_consumida, timestamp_consumo, id]
        );
        return dbGet('SELECT * FROM CONSUMO WHERE id = ?', [id]);
    },

    async delete(id) {
        const item = await dbGet('SELECT * FROM CONSUMO WHERE id = ?', [id]);
        if (!item) return null;
        await dbRun('DELETE FROM CONSUMO WHERE id = ?', [id]);
        return item;
    }
};

module.exports = Consumo;
