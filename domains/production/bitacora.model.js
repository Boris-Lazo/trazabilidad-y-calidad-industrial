
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
            SELECT rt.*, le.proceso_tipo_id, op.codigo_orden, op.producto, op.id as orden_id
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

    async getLastBitacoraId(procesoId) {
        // Encontrar la bitácora más reciente que tenga registros para este proceso
        // Pero NO la actual si queremos "el último registrado" para sugerencia.
        // Aunque si el usuario recarga, igual quiere lo que ya guardó.
        // Sin embargo, para la "sugerencia" inicial suele ser la bitácora anterior.
        const row = await dbGet(`
            SELECT rt.bitacora_id
            FROM registros_trabajo rt
            JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
            WHERE le.proceso_tipo_id = ?
            ORDER BY rt.id DESC LIMIT 1
        `, [procesoId]);
        return row ? row.bitacora_id : null;
    },

    async saveProcesoData(data) {
        const {
            bitacora_id, proceso_id,
            muestras = [],
            produccion = [],
            desperdicio = [],
            observaciones = '',
            no_operativo = false,
            motivo_no_operativo = '',
            isExtrusorPP = false,
            muestras_estructuradas = [],
            mezcla = [],
            incidentes = []
        } = data;

        return new Promise((resolve, reject) => {
            db.serialize(async () => {
                try {
                    // 1. Limpiar registros anteriores
                    await dbRun(`
                        DELETE FROM registros_trabajo
                        WHERE bitacora_id = ?
                        AND linea_ejecucion_id IN (SELECT id FROM lineas_ejecucion WHERE proceso_tipo_id = ?)
                    `, [bitacora_id, proceso_id]);

                    await dbRun(`DELETE FROM muestras WHERE bitacora_id = ? AND proceso_tipo_id = ?`, [bitacora_id, proceso_id]);
                    await dbRun(`DELETE FROM bitacora_proceso_status WHERE bitacora_id = ? AND proceso_tipo_id = ?`, [bitacora_id, proceso_id]);

                    if (no_operativo) {
                        await dbRun(`
                            INSERT INTO bitacora_proceso_status (bitacora_id, proceso_tipo_id, no_operativo, motivo_no_operativo)
                            VALUES (?, ?, 1, ?)
                        `, [bitacora_id, proceso_id, motivo_no_operativo]);
                        return resolve();
                    }

                    // 2. Insertar registros de producción y desperdicio
                    // Si es Extrusor PP, guardaremos el "bloque" de datos extra en el primer registro de trabajo
                    let extraDataSaved = false;

                    for (const p of produccion) {
                        let linea = await dbGet('SELECT id FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_tipo_id = ?', [p.orden_id, proceso_id]);
                        if (!linea) {
                            const result = await dbRun('INSERT INTO lineas_ejecucion (orden_produccion_id, proceso_tipo_id, estado) VALUES (?, ?, ?)', [p.orden_id, proceso_id, 'activo']);
                            linea = { id: result.lastID };
                        }

                        const d = desperdicio.find(d_item => d_item.orden_id == p.orden_id && d_item.maquina == p.maquina);
                        const merma = d ? d.kg : 0;
                        const motivoMerma = d ? d.motivo : '';

                        const paramsObj = { maquina: p.maquina };

                        if (isExtrusorPP && !extraDataSaved) {
                            paramsObj.muestras_estructuradas = muestras_estructuradas;
                            paramsObj.mezcla = mezcla;
                            paramsObj.incidentes = incidentes;
                            extraDataSaved = true;
                        }

                        await dbRun(`
                            INSERT INTO registros_trabajo (cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id, fecha_hora)
                            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        `, [p.cantidad, merma, (observaciones || '') + (motivoMerma ? ' | Motivo merma: ' + motivoMerma : ''), JSON.stringify(paramsObj), linea.id, bitacora_id]);
                    }

                    // 3. Insertar muestras (genérico y estructurado)
                    const firstProd = produccion.find(p => p.orden_id);
                    let mainLoteId = null;
                    if (firstProd) {
                        const lote = await dbGet('SELECT id FROM lotes WHERE orden_produccion_id = ?', [firstProd.orden_id]);
                        if (lote) mainLoteId = lote.id;
                    }

                    if (muestras) {
                        for (const m of muestras) {
                            await dbRun(`
                                INSERT INTO muestras (parametro, valor, resultado, bitacora_id, proceso_tipo_id, lote_id, fecha_analisis)
                                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                            `, [m.parametro, m.valor, m.resultado, bitacora_id, proceso_id, mainLoteId]);
                        }
                    }

                    if (isExtrusorPP && muestras_estructuradas) {
                        for (const m of muestras_estructuradas) {
                            const res = m.estado || 'En espera';
                            // Guardamos la tenacidad como parámetro principal de calidad para que aparezca en reportes generales
                            await dbRun(`
                                INSERT INTO muestras (parametro, valor, resultado, bitacora_id, proceso_tipo_id, lote_id, fecha_analisis, codigo_muestra)
                                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                            `, ['Tenacidad', m.tenacidad, res, bitacora_id, proceso_id, mainLoteId, m.tipo_ronda]);
                        }
                    }

                    // Si es Extrusor PP y no hubo producción, igual guardamos un registro técnico para no perder los parámetros
                    if (isExtrusorPP && !extraDataSaved) {
                        await dbRun(`
                            INSERT INTO registros_trabajo (cantidad_producida, merma_kg, observaciones, parametros, bitacora_id, fecha_hora)
                            VALUES (0, 0, ?, ?, ?, CURRENT_TIMESTAMP)
                        `, [observaciones, JSON.stringify({
                            muestras_estructuradas,
                            mezcla,
                            incidentes
                        }), bitacora_id]);
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
