const BaseProcesoRepository = require('./base/BaseProcesoRepository');

class PeletizadoRepository extends BaseProcesoRepository {
    constructor(db) {
        super(db, 8); // proceso_id = 8
    }

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Inspecciones de calidad ────────────────────────────────────────
    async saveInspeccion(data) {
        const { bitacora_id, maquina_id, orden_id, inspeccion_indice,
                momento, color_pelet, tipo_material,
                usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO peletizado_inspecciones
            (bitacora_id, maquina_id, orden_id, inspeccion_indice,
             momento, color_pelet, tipo_material, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, inspeccion_indice,
            momento, color_pelet, tipo_material, usuario_modificacion]);
    }

    async getInspeccionesByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM peletizado_inspecciones
             WHERE bitacora_id = ? AND maquina_id = ?
             ORDER BY inspeccion_indice ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteInspeccionesByBitacora(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM peletizado_inspecciones WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Correlativo de lote ────────────────────────────────────────────
    async getMaxCorrelativoLoteByOrden(ordenId) {
        const row = await this.db.get(
            `SELECT COUNT(*) as total FROM lotes WHERE orden_produccion_id = ?`, [ordenId]
        );
        return row ? (row.total || 0) : 0;
    }
}

module.exports = PeletizadoRepository;
