const NotFoundError = require('../../shared/errors/NotFoundError');

class VestidosRepository {
    constructor(db) {
        this.db = db;
    }

    // ── Máquina ──
    // Afecta tabla: MAQUINAS
    async getMaquina() {
        const maquina = await this.db.get(
            `SELECT * FROM MAQUINAS WHERE proceso_id = 9 AND activo = 1 LIMIT 1`
        );
        if (!maquina) throw new NotFoundError('No se encontró la máquina configurada para el proceso de Conversión de Sacos Vestidos (CONV#03).');
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

    // ── Rollos de saco ──
    // Afecta tabla: vestidos_consumo_rollo_saco
    async saveConsumoRolloSaco(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
                sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion } = data;
        const result = await this.db.run(`
            INSERT INTO vestidos_consumo_rollo_saco
            (bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
             sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_rollo, origen_proceso_id,
            sacos_producidos, lote_id, registro_trabajo_id, usuario_modificacion]);
        return result.lastID;
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

    // ── Rollos PE ──
    // Afecta tabla: vestidos_consumo_rollo_pe
    async saveConsumoRolloPE(data) {
        const { bitacora_id, maquina_id, orden_id, codigo_lote_pe, lote_pe_id,
                registro_trabajo_id, usuario_modificacion } = data;
        const result = await this.db.run(`
            INSERT INTO vestidos_consumo_rollo_pe
            (bitacora_id, maquina_id, orden_id, codigo_lote_pe, lote_pe_id,
             registro_trabajo_id, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, maquina_id, orden_id, codigo_lote_pe, lote_pe_id,
            registro_trabajo_id, usuario_modificacion]);
        return result.lastID;
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

    // ── Muestras de calidad ──
    // Afecta tabla: vestidos_muestras_calidad
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

    // ── Muestra física ──
    // Afecta tabla: vestidos_muestra_fisica
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

    // ── Defectos ──
    // Afecta tabla: vestidos_defectos
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

    // ── Lotes de saco (sufijo -V) ──
    // Afecta tabla: lotes
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

    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}

module.exports = VestidosRepository;
