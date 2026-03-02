const NotFoundError = require('../../shared/errors/NotFoundError');

class ConversionRepository {
    constructor(db) {
        this.db = db;
    }

    // ── Máquinas ──────────────────────────────────────────────────────────
    // Afecta tabla: MAQUINAS
    async getMaquinasByProceso() {
        const maquinas = await this.db.query(
            `SELECT * FROM MAQUINAS WHERE (proceso_id = 5 OR nombre_visible = 'CONV#03') AND activo = 1`
        );
        if (!maquinas || maquinas.length === 0) {
            throw new NotFoundError('No se encontraron máquinas configuradas para el proceso de Conversión.');
        }
        return maquinas;
    }

    async getMaquinaById(maquinaId) {
        const maquina = await this.db.get(
            `SELECT * FROM MAQUINAS WHERE id = ? AND (proceso_id = 5 OR nombre_visible = 'CONV#03') AND activo = 1`,
            [maquinaId]
        );
        if (!maquina) throw new NotFoundError(`La máquina ID ${maquinaId} no existe o no pertenece al proceso de Conversión.`);
        return maquina;
    }

    // ── Orden ─────────────────────────────────────────────────────────────
    // Afecta tabla: orden_produccion
    async findOrdenCodigo(ordenId) {
        const row = await this.db.get(
            `SELECT codigo_orden FROM orden_produccion WHERE id = ?`, [ordenId]
        );
        return row ? row.codigo_orden : null;
    }

    async getOrdenById(ordenId) {
        return await this.db.get(
            `SELECT * FROM orden_produccion WHERE id = ?`, [ordenId]
        );
    }

    // ── Producción / registros_trabajo ────────────────────────────────────
    // Afecta tabla: registros_trabajo
    async saveRegistroTrabajo(data) {
        const { cantidad_producida, merma_kg, observaciones, parametros,
                linea_ejecucion_id, bitacora_id, maquina_id, usuario_modificacion } = data;
        const result = await this.db.run(`
            INSERT INTO registros_trabajo
            (cantidad_producida, merma_kg, observaciones, parametros,
             linea_ejecucion_id, bitacora_id, maquina_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [cantidad_producida, merma_kg, observaciones, parametros,
            linea_ejecucion_id, bitacora_id, maquina_id, usuario_modificacion]);
        return result.lastID;
    }

    async getUltimoRegistro(bitacoraId, maquinaId) {
        return await this.db.get(`
            SELECT rt.*, le.orden_produccion_id as orden_id
            FROM registros_trabajo rt
            JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
            WHERE rt.bitacora_id = ? AND rt.maquina_id = ?
            ORDER BY rt.created_at DESC LIMIT 1
        `, [bitacoraId, maquinaId]);
    }

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Rollos consumidos ─────────────────────────────────────────────────
    // Afecta tabla: conversion_consumo_rollo
    async saveConsumoRollo(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_rollo,
                sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion } = data;
        const result = await this.db.run(`
            INSERT INTO conversion_consumo_rollo
            (bitacora_id, maquina_id, orden_id, codigo_rollo,
             sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_rollo,
            sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion]);
        return result.lastID;
    }

    async getConsumoRollosByBitacoraYMaquina(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM conversion_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteConsumoRollosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM conversion_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestras de Calidad ───────────────────────────────────────────────
    // Afecta tabla: conversion_muestras_calidad
    async saveMuestraCalidad(data) {
        const { bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
                valor, valor_nominal, resultado, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO conversion_muestras_calidad
            (bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
             valor, valor_nominal, resultado, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
            valor, valor_nominal, resultado, usuario_modificacion]);
    }

    async getMuestrasCalidadByBitacoraYMaquina(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM conversion_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?
             ORDER BY inspeccion_indice ASC, id ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteMuestrasCalidadByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM conversion_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestra Física ────────────────────────────────────────────────────
    // Afecta tabla: conversion_muestra_fisica
    async saveMuestraFisica(data) {
        const { bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
                peso_muestra_gramos, observaciones, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO conversion_muestra_fisica
            (bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
             peso_muestra_gramos, observaciones, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
            peso_muestra_gramos, observaciones, usuario_modificacion]);
    }

    async getMuestraFisicaByOrdenYBitacora(ordenId, bitacoraId) {
        return await this.db.get(
            `SELECT * FROM conversion_muestra_fisica
             WHERE orden_id = ? AND bitacora_id = ?`,
            [ordenId, bitacoraId]
        );
    }

    async deleteMuestraFisicaByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM conversion_muestra_fisica WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Defectos ──────────────────────────────────────────────────────────
    // Afecta tabla: conversion_defectos
    async saveDefecto(data) {
        const { bitacora_id, maquina_id, orden_id, origen_id,
                descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO conversion_defectos
            (bitacora_id, maquina_id, orden_id, origen_id,
             descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, origen_id,
            descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion]);
    }

    async getDefectosByBitacoraYMaquina(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM conversion_defectos WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteDefectosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM conversion_defectos WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Lotes ─────────────────────────────────────────────────────────────
    // Afecta tabla: lotes
    async getMaxCorrelativoConversionPorOrden(ordenId) {
        const row = await this.db.get(
            `SELECT COUNT(*) as total FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE '%-C%'`,
            [ordenId]
        );
        return row ? (row.total || 0) : 0;
    }

    async findLoteExistentePorRollo(ordenId, codigoRollo) {
        return await this.db.get(
            `SELECT * FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE ?`,
            [ordenId, `${codigoRollo}-C%`]
        );
    }

    // ── Estado bitacora_maquina_status ────────────────────────────────────
    // Afecta tabla: bitacora_maquina_status
    async saveEstadoMaquina(bitacoraId, maquinaId, estado, obs) {
        return await this.db.run(`
            INSERT INTO bitacora_maquina_status (bitacora_id, maquina_id, estado, observacion_advertencia)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bitacora_id, maquina_id) DO UPDATE SET
                estado = EXCLUDED.estado,
                observacion_advertencia = EXCLUDED.observacion_advertencia
        `, [bitacoraId, maquinaId, estado, obs]);
    }

    async getEstadoMaquina(bitacoraId, maquinaId) {
        return await this.db.get(
            `SELECT * FROM bitacora_maquina_status WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async getEstadosMaquinasByBitacora(bitacoraId) {
        return await this.db.query(`
            SELECT bms.*, m.nombre_visible
            FROM bitacora_maquina_status bms
            JOIN MAQUINAS m ON bms.maquina_id = m.id
            WHERE bms.bitacora_id = ? AND (m.proceso_id = 5 OR m.nombre_visible = 'CONV#03')
        `, [bitacoraId]);
    }

    // ── Transacción ───────────────────────────────────────────────────────
    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}

module.exports = ConversionRepository;
