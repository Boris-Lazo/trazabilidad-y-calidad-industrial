
const db = require('../../config/database');

const dbAll = (query, params) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbGet = (query, params) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbRun = (query, params) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
};

const Incidente = {
    async findAll() {
        return dbAll('SELECT * FROM incidentes ORDER BY fecha_creacion DESC');
    },

    async findById(id) {
        return dbGet('SELECT * FROM incidentes WHERE id = ?', [id]);
    },

    async create({ titulo, descripcion, severidad, linea_ejecucion_id }) {
        const result = await dbRun(
            'INSERT INTO incidentes (titulo, descripcion, severidad, linea_ejecucion_id, fecha_creacion) VALUES (?, ?, ?, ?, ?)',
            [titulo, descripcion, severidad, linea_ejecucion_id, new Date().toISOString()]
        );
        return this.findById(result.id);
    },

    async update(id, { estado, accion_correctiva }) {
        const fecha_cierre = estado === 'cerrado' ? new Date().toISOString() : null;
        await dbRun(
            'UPDATE incidentes SET estado = ?, accion_correctiva = ?, fecha_cierre = ? WHERE id = ?',
            [estado, accion_correctiva, fecha_cierre, id]
        );
        return this.findById(id);
    }
};

module.exports = Incidente;
