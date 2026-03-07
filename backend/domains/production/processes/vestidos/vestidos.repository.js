const BaseProcesoRepository = require('../base/BaseProcesoRepository');

class VestidosRepository extends BaseProcesoRepository {
    constructor(db) {
        super(db, 9); // proceso_id = 9
    }

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Rollos de saco consumidos ──────────────────────────────
    async saveConsumoRolloSaco(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
                sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO vestidos_consumo_rollo_saco
            (bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
             sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
            sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion]);
    }

    async getConsumoRollosSacoByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM vestidos_consumo_rollo_saco WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteConsumoRollosSacoByBitacora(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM vestidos_consumo_rollo_saco WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Rollos PE consumidos ──────────────────────────────────
    async saveConsumoRolloPE(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_lote_pe,
                lote_pe_id, registro_trabajo_id, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO vestidos_consumo_rollo_pe
            (bitacora_id, maquina_id, orden_id, codigo_lote_pe,
             lote_pe_id, registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_lote_pe,
            lote_pe_id, registro_trabajo_id, usuario_modificacion]);
    }

    async getConsumoRollosPEByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM vestidos_consumo_rollo_pe WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteConsumoRollosPEByBitacora(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM vestidos_consumo_rollo_pe WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestras de calidad ───────────────────────────────────
    async saveMuestraCalidad(data) {
        const { bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
                valor, valor_nominal, resultado, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO vestidos_muestras_calidad
            (bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
             valor, valor_nominal, resultado, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
            valor, valor_nominal, resultado, usuario_modificacion]);
    }

    async getMuestrasCalidadByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM vestidos_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?
             ORDER BY inspeccion_indice ASC, id ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteMuestrasCalidadByBitacora(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM vestidos_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestra Física ────────────────────────────────────────
    async saveMuestraFisica(data) {
        const { bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
                peso_muestra_gramos, observaciones, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO vestidos_muestra_fisica
            (bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
             peso_muestra_gramos, observaciones, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
            peso_muestra_gramos, observaciones, usuario_modificacion]);
    }

    async getMuestraFisicaByOrdenYBitacora(ordenId, bitacoraId) {
        return await this.db.get(
            `SELECT * FROM vestidos_muestra_fisica
             WHERE orden_id = ? AND bitacora_id = ?`,
            [ordenId, bitacoraId]
        );
    }

    async deleteMuestraFisicaByBitacora(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM vestidos_muestra_fisica WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Defectos ──────────────────────────────────────────────
    async saveDefecto(data) {
        const { bitacora_id, maquina_id, orden_id, origen_id,
                descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO vestidos_defectos
            (bitacora_id, maquina_id, orden_id, origen_id,
             descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, origen_id,
            descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion]);
    }

    async getDefectosByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM vestidos_defectos WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteDefectosByBitacora(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM vestidos_defectos WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Lotes ─────────────────────────────────────────────────
    async getMaxCorrelativoVestidosPorOrden(ordenId) {
        const row = await this.db.get(
            `SELECT COUNT(*) as total FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE '%-V%'`,
            [ordenId]
        );
        return row ? (row.total || 0) : 0;
    }

    async findLoteExistentePorRolloSaco(ordenId, codigoRollo) {
        return await this.db.get(
            `SELECT * FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE ?`,
            [ordenId, `${codigoRollo}-V%`]
        );
    }
}

module.exports = VestidosRepository;
