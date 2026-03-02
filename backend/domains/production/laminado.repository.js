const NotFoundError = require('../../shared/errors/NotFoundError');

class LaminadoRepository {
    constructor(db) {
        this.db = db;
    }

    // ── Máquina ──────────────────────────────────────────────────────────
    async getMaquina() {
        const maquina = await this.db.get(
            `SELECT * FROM MAQUINAS WHERE proceso_id = 3 AND activo = 1 LIMIT 1`
        );
        if (!maquina) throw new NotFoundError('No se encontró máquina configurada para Laminado.');
        return maquina;
    }

    // ── Orden ─────────────────────────────────────────────────────────────
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

    async getOrdenEspecificaciones(ordenId) {
        return await this.db.get(
            `SELECT * FROM orden_produccion WHERE id = ?`, [ordenId]
        );
    }

    // ── Producción / registros_trabajo ────────────────────────────────────
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

    // ── Estado bitacora_maquina_status ────────────────────────────────────
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

    // ── Muestras ──────────────────────────────────────────────────────────
    async getMuestrasByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM muestras WHERE bitacora_id = ? AND maquina_id = ? AND proceso_id = 3
             ORDER BY created_at ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteMuestrasByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM muestras WHERE bitacora_id = ? AND maquina_id = ? AND proceso_id = 3`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Rollos consumidos ─────────────────────────────────────────────────
    async saveConsumoRollo(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_rollo,
                metros_laminados, registro_trabajo_id, usuario_modificacion } = data;
        const result = await this.db.run(`
            INSERT INTO laminado_consumo_rollo
            (bitacora_id, maquina_id, orden_id, codigo_rollo, metros_laminados,
             registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_rollo,
            metros_laminados, registro_trabajo_id, usuario_modificacion]);
        return result.lastID;
    }

    async getConsumoRollosByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM laminado_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteConsumoRollosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM laminado_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Materias primas ───────────────────────────────────────────────────
    async saveMateriasPrimas(data) {
        const { bitacora_id, maquina_id, tipo, marca, lote_material,
                porcentaje, pdf_hoja_tecnica, pdf_nombre_archivo, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO laminado_materias_primas
            (bitacora_id, maquina_id, tipo, marca, lote_material, porcentaje,
             pdf_hoja_tecnica, pdf_nombre_archivo, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, tipo, marca, lote_material, porcentaje,
            pdf_hoja_tecnica || null, pdf_nombre_archivo || null, usuario_modificacion]);
    }

    async getMateriasPrimasByBitacora(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT id, tipo, marca, lote_material, porcentaje,
                    pdf_nombre_archivo, created_at
             FROM laminado_materias_primas
             WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteMateriasPrimasByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM laminado_materias_primas WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── PDF central de materiales ─────────────────────────────────────────
    // Busca un PDF ya subido para un tipo+marca+lote específico
    async getPdfMaterial(tipo, marca, loteMaterial) {
        return await this.db.get(
            `SELECT * FROM laminado_pdf_materiales
             WHERE tipo = ? AND marca = ? AND lote_material = ?`,
            [tipo, marca, loteMaterial]
        );
    }

    // Guarda o actualiza el PDF central para un tipo+marca+lote
    async upsertPdfMaterial(tipo, marca, loteMaterial, pdfBlob, pdfNombre, usuario) {
        return await this.db.run(`
            INSERT INTO laminado_pdf_materiales
            (tipo, marca, lote_material, pdf_hoja_tecnica, pdf_nombre_archivo, subido_por)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(tipo, marca, lote_material) DO UPDATE SET
                pdf_hoja_tecnica = EXCLUDED.pdf_hoja_tecnica,
                pdf_nombre_archivo = EXCLUDED.pdf_nombre_archivo,
                subido_por = EXCLUDED.subido_por
        `, [tipo, marca, loteMaterial, pdfBlob, pdfNombre, usuario]);
    }

    // ── Lotes ─────────────────────────────────────────────────────────────
    // El código de lote en Laminado es el código del rollo de Telares
    // con sufijo del correlativo laminado: R047-T05-L001
    async getMaxCorrelativoLaminadoPorOrden(ordenId) {
        // Cuenta cuántos lotes de laminado existen ya para esta orden
        // El correlativo reinicia por orden.
        const row = await this.db.get(`
            SELECT COUNT(*) as total FROM lotes
            WHERE orden_produccion_id = ? AND codigo_lote LIKE '%-L%'
        `, [ordenId]);
        return row ? (row.total || 0) : 0;
    }

    // ── Desperdicio ───────────────────────────────────────────────────────
    async getDesperdicioByBitacora(bitacoraId, maquinaId) {
        const row = await this.db.get(`
            SELECT SUM(merma_kg) as total_merma
            FROM registros_trabajo
            WHERE bitacora_id = ? AND maquina_id = ?
        `, [bitacoraId, maquinaId]);
        return row ? (row.total_merma || 0) : 0;
    }

    // ── Transacción ───────────────────────────────────────────────────────
    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}

module.exports = LaminadoRepository;
