
const db = require('../../config/database');

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

const Bitacora = {
    async findAbierta() {
        return dbGet('SELECT * FROM bitacora_turno WHERE estado = ?', ['EN CURSO']);
    },

    async create({ turno, fecha_operativa, inspector, fuera_de_horario }) {
        const result = await dbRun(
            'INSERT INTO bitacora_turno (turno, fecha_operativa, inspector, fuera_de_horario) VALUES (?, ?, ?, ?)',
            [turno, fecha_operativa, inspector, fuera_de_horario ? 1 : 0]
        );
        return dbGet('SELECT * FROM bitacora_turno WHERE id = ?', [result.lastID]);
    },

    async close(id) {
        await dbRun(
            'UPDATE bitacora_turno SET estado = ?, fecha_cierre = CURRENT_TIMESTAMP WHERE id = ?',
            ['CERRADA', id]
        );
        return dbGet('SELECT * FROM bitacora_turno WHERE id = ?', [id]);
    },

    async findById(id) {
        return dbGet('SELECT * FROM bitacora_turno WHERE id = ?', [id]);
    },

    async getInspectores() {
        return dbAll('SELECT nombre FROM usuarios', []);
    },

    async getResumenProcesos(bitacoraId) {
        // Esta función calculará el estado de cada proceso para una bitácora específica.
        // Por ahora retornamos una lista de procesos tipos y luego el controlador calculará el estado.
        const procesos = await dbAll('SELECT * FROM PROCESO_TIPO WHERE activo = 1', []);
        return procesos;
    },

    async getRegistrosByProceso(bitacoraId, procesoTipoId) {
        return dbAll(`
            SELECT rt.*, le.proceso_tipo_id, op.codigo_orden, op.producto
            FROM registros_trabajo rt
            JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
            JOIN orden_produccion op ON le.orden_produccion_id = op.id
            WHERE rt.bitacora_id = ? AND le.proceso_tipo_id = ?
        `, [bitacoraId, procesoTipoId]);
    },

    async getMuestrasByProceso(bitacoraId, procesoTipoId) {
        return dbAll(`
            SELECT m.*
            FROM muestras m
            WHERE m.bitacora_id = ? AND m.proceso_tipo_id = ?
        `, [bitacoraId, procesoTipoId]);
    },

    async getProcesoStatus(bitacoraId, procesoTipoId) {
        return dbGet(`
            SELECT * FROM bitacora_proceso_status
            WHERE bitacora_id = ? AND proceso_tipo_id = ?
        `, [bitacoraId, procesoTipoId]);
    },

    async saveProcesoData({ bitacora_id, proceso_id, muestras, produccion, desperdicio, observaciones, no_operativo, motivo_no_operativo }) {
        return new Promise((resolve, reject) => {
            db.serialize(async () => {
                try {
                    // 1. Limpiar registros anteriores
                    // Eliminar registros de trabajo vinculados a líneas de ejecución de este proceso en esta bitácora
                    await dbRun(`
                        DELETE FROM registros_trabajo
                        WHERE bitacora_id = ?
                        AND linea_ejecucion_id IN (SELECT id FROM lineas_ejecucion WHERE proceso_tipo_id = ?)
                    `, [bitacora_id, proceso_id]);

                    // Eliminar muestras vinculadas a este proceso en esta bitácora
                    await dbRun(`DELETE FROM muestras WHERE bitacora_id = ? AND proceso_tipo_id = ?`, [bitacora_id, proceso_id]);

                    // Limpiar estado de operatividad previo
                    await dbRun(`DELETE FROM bitacora_proceso_status WHERE bitacora_id = ? AND proceso_tipo_id = ?`, [bitacora_id, proceso_id]);

                    // Si es NO OPERATIVO, guardamos solo eso y salimos
                    if (no_operativo) {
                        await dbRun(`
                            INSERT INTO bitacora_proceso_status (bitacora_id, proceso_tipo_id, no_operativo, motivo_no_operativo)
                            VALUES (?, ?, 1, ?)
                        `, [bitacora_id, proceso_id, motivo_no_operativo]);
                        return resolve();
                    }

                    // 2. Insertar nuevos registros de producción y desperdicio
                    for (const p of produccion) {
                        let linea = await dbGet('SELECT id FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_tipo_id = ?', [p.orden_id, proceso_id]);
                        if (!linea) {
                            const result = await dbRun('INSERT INTO lineas_ejecucion (orden_produccion_id, proceso_tipo_id, estado) VALUES (?, ?, ?)', [p.orden_id, proceso_id, 'activo']);
                            linea = { id: result.lastID };
                        }

                        const d = desperdicio.find(d_item => d_item.orden_id == p.orden_id && d_item.maquina == p.maquina);
                        const merma = d ? d.kg : 0;

                        // Almacenamos la máquina en el campo 'parametros' como JSON, o en observaciones.
                        // Usaremos 'parametros' para la máquina.
                        await dbRun(`
                            INSERT INTO registros_trabajo (cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id, fecha_hora)
                            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        `, [p.cantidad, merma, observaciones, JSON.stringify({ maquina: p.maquina }), linea.id, bitacora_id]);
                    }

                    // 3. Insertar nuevas muestras
                    for (const m of muestras) {
                        let loteId = null;
                        // Intentar buscar un lote para la primera orden de producción
                        const firstProd = produccion.find(p => p.orden_id);
                        if (firstProd) {
                           const lote = await dbGet('SELECT id FROM lotes WHERE orden_produccion_id = ?', [firstProd.orden_id]);
                           if (lote) loteId = lote.id;
                           else {
                               const result = await dbRun('INSERT INTO lotes (codigo_lote, orden_produccion_id, fecha_produccion) VALUES (?, ?, CURRENT_DATE)', [`LOTE-${Date.now()}-${Math.floor(Math.random()*1000)}`, firstProd.orden_id]);
                               loteId = result.lastID;
                           }
                        }

                        await dbRun(`
                            INSERT INTO muestras (parametro, valor, resultado, bitacora_id, proceso_tipo_id, lote_id, fecha_analisis)
                            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        `, [m.parametro, m.valor, m.resultado, bitacora_id, proceso_id, loteId]);
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }
};

module.exports = Bitacora;
