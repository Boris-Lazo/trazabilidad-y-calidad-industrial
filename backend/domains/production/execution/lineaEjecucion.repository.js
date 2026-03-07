class LineaEjecucionRepository {
    constructor(db) {
        this.db = db;
    }

    async findAll() {
        return await this.db.query('SELECT * FROM lineas_ejecucion');
    }

    async findByOrdenProduccionId(ordenId) {
        return await this.db.query('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ?', [ordenId]);
    }

    async findByOrdenAndProceso(ordenId, procesoId, maquinaId = null) {
        if (maquinaId) {
            return await this.db.get('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_id = ? AND maquina_id = ?', [ordenId, procesoId, maquinaId]);
        }
        return await this.db.get('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_id = ?', [ordenId, procesoId]);
    }

    async create(ordenId, procesoId, maquinaId = null) {
        const result = await this.db.run('INSERT INTO lineas_ejecucion (orden_produccion_id, proceso_id, maquina_id, estado, fecha_inicio) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', [ordenId, procesoId, maquinaId, 'ACTIVA']);
        return result.lastID;
    }

    async updateEstado(id, estado) {
        const sql = estado === 'COMPLETADA' || estado === 'CANCELADA'
            ? 'UPDATE lineas_ejecucion SET estado = ?, fecha_fin = CURRENT_TIMESTAMP WHERE id = ?'
            : 'UPDATE lineas_ejecucion SET estado = ? WHERE id = ?';
        return await this.db.run(sql, [estado, id]);
    }

    async findActiveByMaquina(maquinaId) {
        return await this.db.get('SELECT * FROM lineas_ejecucion WHERE maquina_id = ? AND estado = ?', [maquinaId, 'ACTIVA']);
    }

    async findById(id) {
        return await this.db.get('SELECT * FROM lineas_ejecucion WHERE id = ?', [id]);
    }
}

module.exports = LineaEjecucionRepository;
