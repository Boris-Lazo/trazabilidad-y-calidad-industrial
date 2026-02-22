class RegistroTrabajoRepository {
    constructor(db) {
        this.db = db;
    }

    async findAll() {
        return await this.db.query('SELECT * FROM registros_trabajo');
    }

    async findByLineaEjecucionId(lineaId) {
        return await this.db.query('SELECT * FROM registros_trabajo WHERE linea_ejecucion_id = ?', [lineaId]);
    }

    async create(data) {
        const { cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id } = data;
        const result = await this.db.run(
            'INSERT INTO registros_trabajo (cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id, fecha_hora) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id]
        );
        return result.lastID;
    }
}

module.exports = RegistroTrabajoRepository;
