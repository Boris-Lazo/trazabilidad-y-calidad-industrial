const BaseProcesoRepository = require('./base/BaseProcesoRepository');

class ImprentaRepository extends BaseProcesoRepository {
    constructor(db) {
        super(db, 4); // proceso_id = 4
    }

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Rollos consumidos ─────────────────────────────────────────────────
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
}

module.exports = ImprentaRepository;
