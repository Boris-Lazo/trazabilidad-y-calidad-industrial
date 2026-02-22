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
            return await this.db.get('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_tipo_id = ? AND maquina_id = ?', [ordenId, procesoId, maquinaId]);
        }
        return await this.db.get('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_tipo_id = ?', [ordenId, procesoId]);
    }

    async create(ordenId, procesoId, maquinaId = null) {
        const result = await this.db.run('INSERT INTO lineas_ejecucion (orden_produccion_id, proceso_tipo_id, maquina_id, estado) VALUES (?, ?, ?, ?)', [ordenId, procesoId, maquinaId, 'activo']);
        return result.lastID;
    }
}

module.exports = LineaEjecucionRepository;
