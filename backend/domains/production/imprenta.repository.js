const NotFoundError = require('../../shared/errors/NotFoundError');

class ImprentaRepository {
    constructor(db) {
        this.db = db;
    }

    // ── Máquina ──────────────────────────────────────────────────────────
    // Afecta tabla: MAQUINAS
    async getMaquina() {
        const maquina = await this.db.get(
            `SELECT * FROM MAQUINAS WHERE proceso_id = 4 AND activo = 1 LIMIT 1`
        );
        if (!maquina) throw new NotFoundError('No se encontró máquina configurada para Imprenta.');
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
            SELECT * FROM registros_trabajo
            WHERE bitacora_id = ? AND maquina_id = ?
            ORDER BY created_at DESC LIMIT 1
        `, [bitacoraId, maquinaId]);
    }

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Rollos consumidos ─────────────────────────────────────────────────
    // Afecta tabla: imprenta_consumo_rollo
    async saveConsumoRollo(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
                metros_consumidos, impresiones_producidas, lote_id,
                registro_trabajo_id, usuario_modificacion } = data;
        const result = await this.db.run(`
            INSERT INTO imprenta_consumo_rollo
            (bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
             metros_consumidos, impresiones_producidas, lote_id,
             registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
            metros_consumidos, impresiones_producidas, lote_id,
            registro_trabajo_id, usuario_modificacion]);
        return result.lastID;
    }

    async getConsumoRollosByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM imprenta_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteConsumoRollosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM imprenta_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Tintas ────────────────────────────────────────────────────────────
    // Afecta tabla: imprenta_tintas
    async saveTinta(data) {
        const { bitacora_id, maquina_id, orden_id, posicion, numero_color,
                codigo_pantone, tipo, marca, lote, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO imprenta_tintas
            (bitacora_id, maquina_id, orden_id, posicion, numero_color,
             codigo_pantone, tipo, marca, lote, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, posicion, numero_color,
            codigo_pantone, tipo, marca, lote, usuario_modificacion]);
    }

    async getTintasByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM imprenta_tintas WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteTintasByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM imprenta_tintas WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestras de Calidad ───────────────────────────────────────────────
    // Afecta tabla: imprenta_muestras_calidad
    async saveMuestraCalidad(data) {
        const { bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
                valor, resultado, tinta_posicion, tinta_numero_color,
                tinta_codigo_pantone, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO imprenta_muestras_calidad
            (bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
             valor, resultado, tinta_posicion, tinta_numero_color,
             tinta_codigo_pantone, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
            valor, resultado, tinta_posicion, tinta_numero_color,
            tinta_codigo_pantone, usuario_modificacion]);
    }

    async getMuestrasCalidadByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM imprenta_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?
             ORDER BY inspeccion_indice ASC, id ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteMuestrasCalidadByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM imprenta_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Lotes ─────────────────────────────────────────────────────────────
    // Afecta tabla: lotes
    async getMaxCorrelativoImprentaPorOrden(ordenId) {
        const row = await this.db.get(
            `SELECT COUNT(*) as total FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE '%-I%'`,
            [ordenId]
        );
        return row ? (row.total || 0) : 0;
    }

    async findLoteExistentePorRollo(ordenId, codigoRollo) {
        return await this.db.get(
            `SELECT * FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE ?`,
            [ordenId, `${codigoRollo}-I%`]
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

    // ── Transacción ───────────────────────────────────────────────────────
    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}

module.exports = ImprentaRepository;
