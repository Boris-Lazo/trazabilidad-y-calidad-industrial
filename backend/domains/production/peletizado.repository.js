const NotFoundError = require('../../shared/errors/NotFoundError');

class PeletizadoRepository {
    constructor(db) {
        this.db = db;
    }

    // ── Máquina ────────────────────────────────────────────────────────
    async getMaquina() {
        const row = await this.db.get(
            `SELECT * FROM MAQUINAS WHERE proceso_id = 8 AND activo = 1 LIMIT 1`
        );
        if (!row) throw new NotFoundError('No se encontró la máquina PELET configurada para el proceso 8.');
        return row;
    }

    // ── Orden ──────────────────────────────────────────────────────────
    async findOrdenCodigo(ordenId) {
        const row = await this.db.get(
            `SELECT codigo_orden FROM orden_produccion WHERE id = ?`, [ordenId]
        );
        return row ? row.codigo_orden : null;
    }

    async getOrdenById(ordenId) {
        return await this.db.get(`SELECT * FROM orden_produccion WHERE id = ?`, [ordenId]);
    }

    // ── Registro de trabajo ────────────────────────────────────────────
    async getUltimoRegistro(bitacoraId, maquinaId) {
        return await this.db.get(`
            SELECT rt.*, le.orden_produccion_id as orden_id
            FROM registros_trabajo rt
            JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
            WHERE rt.bitacora_id = ? AND rt.maquina_id = ?
            ORDER BY rt.created_at DESC LIMIT 1
        `, [bitacoraId, maquinaId]);
    }

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

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Inspecciones de calidad ────────────────────────────────────────
    // Tabla: peletizado_inspecciones
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

    // ── Estado de máquina ──────────────────────────────────────────────
    async saveEstadoMaquina(bitacoraId, maquinaId, estado, observacion) {
        return await this.db.run(`
            INSERT INTO bitacora_maquina_status (bitacora_id, maquina_id, estado, observacion_advertencia)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bitacora_id, maquina_id) DO UPDATE SET
                estado = EXCLUDED.estado,
                observacion_advertencia = EXCLUDED.observacion_advertencia
        `, [bitacoraId, maquinaId, estado, observacion]);
    }

    async getEstadoMaquina(bitacoraId, maquinaId) {
        return await this.db.get(
            `SELECT * FROM bitacora_maquina_status WHERE bitacora_id = ? AND maquina_id = ?`,
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

    // ── Transacción ───────────────────────────────────────────────────
    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}

module.exports = PeletizadoRepository;
