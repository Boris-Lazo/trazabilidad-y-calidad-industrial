const BaseProcesoRepository = require('../base/BaseProcesoRepository');
const NotFoundError = require('../../../../shared/errors/NotFoundError');

class ConversionRepository extends BaseProcesoRepository {
    constructor(db) {
        super(db, 5); // proceso_id = 5
    }

    async getMaquinasByProceso() {
        const maquinas = await this.db.query(
            `SELECT * FROM MAQUINAS WHERE (proceso_id = 5 OR codigo = 'CONV03') AND activo = 1`
        );
        if (!maquinas || maquinas.length === 0) {
            throw new NotFoundError('No se encontraron máquinas configuradas para el proceso de Conversión.');
        }
        return maquinas;
    }

    async getMaquinaById(maquinaId) {
        const maquina = await this.db.get(
            `SELECT * FROM MAQUINAS WHERE id = ? AND (proceso_id = 5 OR codigo = 'CONV03') AND activo = 1`,
            [maquinaId]
        );
        if (!maquina) throw new NotFoundError(`La máquina ID ${maquinaId} no existe o no pertenece al proceso de Conversión.`);
        return maquina;
    }

    async deleteRegistrosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Rollos consumidos ─────────────────────────────────────────────────
    async saveConsumoRollo(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_rollo,
                sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion } = data;
        const result = await this.db.run(`
            INSERT INTO conversion_consumo_rollo
            (bitacora_id, maquina_id, orden_id, codigo_rollo,
             sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_rollo,
            sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion]);
        return result.lastID;
    }

    async getConsumoRollosByBitacoraYMaquina(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM conversion_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteConsumoRollosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM conversion_consumo_rollo WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestras de Calidad ───────────────────────────────────────────────
    async saveMuestraCalidad(data) {
        const { bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
                valor, valor_nominal, resultado, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO conversion_muestras_calidad
            (bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
             valor, valor_nominal, resultado, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, inspeccion_indice, parametro,
            valor, valor_nominal, resultado, usuario_modificacion]);
    }

    async getMuestrasCalidadByBitacoraYMaquina(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM conversion_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?
             ORDER BY inspeccion_indice ASC, id ASC`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteMuestrasCalidadByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM conversion_muestras_calidad WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Muestra Física ────────────────────────────────────────────────────
    async saveMuestraFisica(data) {
        const { bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
                peso_muestra_gramos, observaciones, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO conversion_muestra_fisica
            (bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
             peso_muestra_gramos, observaciones, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, ancho_muestra, largo_muestra,
            peso_muestra_gramos, observaciones, usuario_modificacion]);
    }

    async getMuestraFisicaByOrdenYBitacora(ordenId, bitacoraId) {
        return await this.db.get(
            `SELECT * FROM conversion_muestra_fisica
             WHERE orden_id = ? AND bitacora_id = ?`,
            [ordenId, bitacoraId]
        );
    }

    async deleteMuestraFisicaByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM conversion_muestra_fisica WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Defectos ──────────────────────────────────────────────────────────
    async saveDefecto(data) {
        const { bitacora_id, maquina_id, orden_id, origen_id,
                descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion } = data;
        return await this.db.run(`
            INSERT INTO conversion_defectos
            (bitacora_id, maquina_id, orden_id, origen_id,
             descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, origen_id,
            descripcion_defecto, cantidad_sacos_afectados, usuario_modificacion]);
    }

    async getDefectosByBitacoraYMaquina(bitacoraId, maquinaId) {
        return await this.db.query(
            `SELECT * FROM conversion_defectos WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    async deleteDefectosByBitacoraYMaquina(bitacoraId, maquinaId) {
        await this.db.run(
            `DELETE FROM conversion_defectos WHERE bitacora_id = ? AND maquina_id = ?`,
            [bitacoraId, maquinaId]
        );
    }

    // ── Lotes ─────────────────────────────────────────────────────────────
    async getMaxCorrelativoConversionPorOrden(ordenId) {
        const row = await this.db.get(
            `SELECT COUNT(*) as total FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE '%-C%'`,
            [ordenId]
        );
        return row ? (row.total || 0) : 0;
    }

    async findLoteExistentePorRollo(ordenId, codigoRollo) {
        return await this.db.get(
            `SELECT * FROM lotes
             WHERE orden_produccion_id = ? AND codigo_lote LIKE ?`,
            [ordenId, `${codigoRollo}-C%`]
        );
    }

    async getEstadosMaquinasByBitacora(bitacoraId) {
        return await this.db.query(`
            SELECT bms.*, m.nombre_visible, m.codigo
            FROM bitacora_maquina_status bms
            JOIN MAQUINAS m ON bms.maquina_id = m.id
            WHERE bms.bitacora_id = ? AND (m.proceso_id = 5 OR m.codigo = 'CONV03')
        `, [bitacoraId]);
    }
}

module.exports = ConversionRepository;
