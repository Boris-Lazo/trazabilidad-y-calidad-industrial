const BaseProcesoRepository = require('./base/BaseProcesoRepository');

class LinerPERepository extends BaseProcesoRepository {
    constructor(db) {
        super(db, 7); // proceso_id = 7
    }

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Rollos PE consumidos ──────────────────────────────────
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

    // ── Muestras de calidad ───────────────────────────────────
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

    // ── Lote del turno ────────────────────────────────────────
    async getMaxCorrelativoLinerPEPorOrden(ordenId) {
        const row = await this.db.get(
            `SELECT COUNT(*) as total FROM lotes
             WHERE orden_produccion_id = ?`,
            [ordenId]
        );
        return row ? (row.total || 0) : 0;
    }
}

module.exports = LinerPERepository;
