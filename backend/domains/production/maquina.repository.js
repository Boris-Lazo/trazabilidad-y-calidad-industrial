class MaquinaRepository {
    constructor(db) {
        this.db = db;
    }

    async findAll() {
        return await this.db.query(`
            SELECT m.*,
            (SELECT COUNT(*) FROM lineas_ejecucion le WHERE le.maquina_id = m.id AND le.estado = 'ACTIVA') as ordenes_activas
            FROM MAQUINAS m
            ORDER BY m.proceso_id, m.nombre_visible
        `);
    }

    async findById(id) {
        return await this.db.get("SELECT * FROM MAQUINAS WHERE id = ?", [id]);
    }

    async findByProceso(procesoId) {
        return await this.db.query("SELECT * FROM MAQUINAS WHERE proceso_id = ? AND activo = 1", [procesoId]);
    }

    async updateEstado(id, nuevoEstado, motivo, categoria, usuario, dataAdicional = {}) {
        const { fecha_baja, motivo_baja, estadoAnterior } = dataAdicional;

        // Actualizar máquina
        let sql = "UPDATE MAQUINAS SET estado_actual = ?, updated_at = CURRENT_TIMESTAMP";
        const params = [nuevoEstado];

        if (fecha_baja !== undefined) {
            sql += ", fecha_baja = ?";
            params.push(fecha_baja);
        }
        if (motivo_baja !== undefined) {
            sql += ", motivo_baja = ?";
            params.push(motivo_baja);
        }

        sql += " WHERE id = ?";
        params.push(id);

        await this.db.run(sql, params);

        // Registrar en historial de estados
        await this.db.run(`
            INSERT INTO maquina_estados_historial
            (maquina_id, estado_anterior, estado_nuevo, motivo, categoria_motivo, usuario)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, estadoAnterior, nuevoEstado, motivo, categoria, usuario]);
    }

    async getHistorialEstados(maquinaId) {
        return await this.db.query(`
            SELECT * FROM maquina_estados_historial
            WHERE maquina_id = ?
            ORDER BY fecha_hora DESC
        `, [maquinaId]);
    }

    async getParametros(maquinaId) {
        return await this.db.query("SELECT * FROM maquina_parametros_config WHERE maquina_id = ?", [maquinaId]);
    }

    async hasActiveOrders(maquinaId) {
        const sql = "SELECT COUNT(*) as count FROM lineas_ejecucion WHERE maquina_id = ? AND estado = 'ACTIVA'";
        const result = await this.db.get(sql, [maquinaId]);
        return result.count > 0;
    }

    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}

module.exports = MaquinaRepository;
