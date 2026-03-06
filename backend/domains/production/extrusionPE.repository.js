const NotFoundError = require('../../shared/errors/NotFoundError');

class ExtrusionPERepository {
    constructor(db) {
        this.db = db;
    }

    // ── Máquinas (proceso 6 tiene EXTPE01 y EXTPE02) ──────────────────
    async getMaquinas() {
        const rows = await this.db.query(
            `SELECT * FROM MAQUINAS WHERE proceso_id = 6 AND activo = 1 ORDER BY nombre_visible`
        );
        if (!rows || rows.length === 0)
            throw new NotFoundError('No se encontraron máquinas configuradas para Extrusión PE (proceso 6).');
        return rows;
    }

    async getMaquinaById(maquinaId) {
        const row = await this.db.get(
            `SELECT * FROM MAQUINAS WHERE id = ? AND proceso_id = 6 AND activo = 1`, [maquinaId]
        );
        if (!row)
            throw new NotFoundError(`Máquina ID ${maquinaId} no pertenece a Extrusión PE o no está activa.`);
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
        return await this.db.get(
            `SELECT * FROM orden_produccion WHERE id = ?`, [ordenId]
        );
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

    // ── Rollos producidos (tabla extru_pe_rollos) ──────────────────────
    async saveRollo(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_rollo,
                peso_kg, registro_trabajo_id, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO extru_pe_rollos
            (bitacora_id, maquina_id, orden_id, codigo_rollo,
             peso_kg, registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_rollo,
            peso_kg, registro_trabajo_id, usuario_modificacion]);
    }

    async getRollosByBitacoraYMaquina(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM extru_pe_rollos
             WHERE bitacora_id = ? AND maquina_id = ?
             ORDER BY id ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteRollosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM extru_pe_rollos WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestras de calidad (tabla extru_pe_muestras) ─────────────────
    async saveMuestra(data) {
        const { bitacora_id, maquina_id, orden_id, lectura_indice,
                espesor_mm, ancho_burbuja, microperforado,
                espesor_resultado, ancho_resultado,
                usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO extru_pe_muestras
            (bitacora_id, maquina_id, orden_id, lectura_indice,
             espesor_mm, ancho_burbuja, microperforado,
             espesor_resultado, ancho_resultado,
             usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, lectura_indice,
            espesor_mm, ancho_burbuja, microperforado,
            espesor_resultado, ancho_resultado,
            usuario_modificacion]);
    }

    async getMuestrasByBitacoraYMaquina(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM extru_pe_muestras
             WHERE bitacora_id = ? AND maquina_id = ?
             ORDER BY lectura_indice ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteMuestrasByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM extru_pe_muestras WHERE bitacora_id = ? AND maquina_id = ?`,
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
            `SELECT COUNT(*) as total FROM lotes WHERE orden_produccion_id = ?`,
            [ordenId]
        );
        return row ? (row.total || 0) : 0;
    }

    // ── Transacción ───────────────────────────────────────────────────
    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}
module.exports = ExtrusionPERepository;