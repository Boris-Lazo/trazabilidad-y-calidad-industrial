
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
        // Obtenemos las órdenes con sumatorias de producción y merma
        const query = `
            SELECT
                op.*,
                COALESCE(SUM(rt.cantidad_producida), 0) as cantidad_producida,
                COALESCE(SUM(rt.merma_kg), 0) as merma_total
            FROM orden_produccion op
            LEFT JOIN lineas_ejecucion le ON op.id = le.orden_produccion_id
            LEFT JOIN registros_trabajo rt ON le.id = rt.linea_ejecucion_id
            GROUP BY op.id
            ORDER BY op.fecha_creacion DESC
        `;
        return dbAll(query);
    },

    async findById(id) {
        return dbGet('SELECT * FROM orden_produccion WHERE id = ?', [id]);
    },

    async create({ codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion }) {
        const result = await dbRun(
            'INSERT INTO orden_produccion (codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado || 'abierta', fecha_creacion || new Date().toISOString()]
        );
        return dbGet('SELECT * FROM orden_produccion WHERE id = ?', [result.id]);
    },

    async update(id, { producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado }) {
        await dbRun(
            'UPDATE orden_produccion SET producto = ?, cantidad_objetivo = ?, unidad = ?, fecha_planificada = ?, prioridad = ?, observaciones = ?, estado = ? WHERE id = ?',
            [producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        const orden = await this.findById(id);
        if (orden) {
            await dbRun('DELETE FROM orden_produccion WHERE id = ?', [id]);
            return orden;
        }
        return null;
    }
};

module.exports = OrdenProduccion;
