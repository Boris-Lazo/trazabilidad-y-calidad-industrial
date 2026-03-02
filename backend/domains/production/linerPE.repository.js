const NotFoundError = require('../../shared/errors/NotFoundError');

class LinerPERepository {
    constructor(db) {
        this.db = db;
    }

    // ── Máquina ──
    // Afecta tabla: MAQUINAS
    async getMaquina() {
        const maquina = await this.db.get(
            `SELECT * FROM MAQUINAS WHERE proceso_id = 7 AND activo = 1 LIMIT 1`
        );
        if (!maquina) {
            throw new NotFoundError('No se encontró la máquina configurada para Conversión de Liner PE (CONV-LI).');
        }
        return maquina;
    }

    // ── Orden ──
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

    // ── Producción ──
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

    // ── Rollos PE consumidos ──
    // Afecta tabla: liner_pe_consumo_rollo
    async saveConsumoRolloPE(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_lote_pe,
                lote_pe_id, registro_trabajo_id, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO liner_pe_consumo_rollo
            (bitacora_id, maquina_id, orden_id, codigo_lote_pe,
             lote_pe_id, registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_lote_pe,
            lote_pe_id, registro_trabajo_id, usuario_modificacion]);
    }

    async getConsumoRollosPEByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM liner_pe_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteConsumoRollosPEByBitacora(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM liner_pe_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestras de calidad ──
    // Afecta tabla: liner_pe_muestras_calidad
    async saveMuestraCalidad(data) {
        const { bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
                valor, valor_nominal, resultado, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO liner_pe_muestras_calidad
            (bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
             valor, valor_nominal, resultado, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
            valor, valor_nominal, resultado, usuario_modificacion]);
    }

    async getMuestrasCalidadByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM liner_pe_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?
             ORDER BY inspeccion_indice ASC, id ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteMuestrasCalidadByBitacora(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM liner_pe_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Lote del turno ──
    // Afecta tabla: lotes
    async getMaxCorrelativoLinerPEPorOrden(ordenId) {
        const row = await this.db.get(
            `SELECT COUNT(*) as total FROM lotes
             WHERE orden_produccion_id = ?`,
            [ordenId]
        );
        return row ? (row.total || 0) : 0;
    }

    // ── Estado ──
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

    // ── Transacción ──
    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}

module.exports = LinerPERepository;
