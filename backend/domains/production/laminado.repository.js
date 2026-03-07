const BaseProcesoRepository = require('./base/BaseProcesoRepository');

class LaminadoRepository extends BaseProcesoRepository {
    constructor(db) {
        super(db, 3); // proceso_id = 3
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

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
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
    async getPdfMaterial(tipo, marca, loteMaterial) {
        return await this.db.get(
            `SELECT * FROM laminado_pdf_materiales
             WHERE tipo = ? AND marca = ? AND lote_material = ?`,
            [tipo, marca, loteMaterial]
        );
    }

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
    async getMaxCorrelativoLaminadoPorOrden(ordenId) {
        const row = await this.db.get(`
            SELECT COUNT(*) as total FROM lotes
            WHERE orden_produccion_id = ? AND codigo_lote LIKE '%-L%'
        `, [ordenId]);
        return row ? (row.total || 0) : 0;
    }

    async findLoteExistentePorRollo(ordenId, codigoRollo) {
        return await this.db.get(
            `SELECT * FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE ?`,
            [ordenId, `${codigoRollo}-L%`]
        );
    }
}

module.exports = LaminadoRepository;
