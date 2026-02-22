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

    async findByOrdenAndProceso(ordenId, procesoId) {
        return await this.db.get('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_tipo_id = ?', [ordenId, procesoId]);
    }

    async create(ordenId, procesoId) {
        const result = await this.db.run('INSERT INTO lineas_ejecucion (orden_produccion_id, proceso_tipo_id, estado) VALUES (?, ?, ?)', [ordenId, procesoId, 'activo']);
        return result.lastID;
    }
}

module.exports = LineaEjecucionRepository;
