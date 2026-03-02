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

    async findByLineaYBitacoraYMaquina(lineaId, bitacoraId, maquinaId) {
        return await this.db.get(
            'SELECT * FROM registros_trabajo WHERE linea_ejecucion_id = ? AND bitacora_id = ? AND maquina_id = ? LIMIT 1',
            [lineaId, bitacoraId, maquinaId]
        );
    }

    async create(data) {
        const { cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id, maquina_id, usuario_modificacion } = data;
        const result = await this.db.run(
            'INSERT INTO registros_trabajo (cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id, maquina_id, usuario_modificacion, fecha_modificacion, fecha_hora) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id, maquina_id, usuario_modificacion]
        );
        return result.lastID;
    }

    async update(id, data) {
        const { cantidad_producida, merma_kg, observaciones, parametros, usuario_modificacion } = data;
        return await this.db.run(
            `UPDATE registros_trabajo
             SET cantidad_producida = ?, merma_kg = ?, observaciones = ?, parametros = ?, usuario_modificacion = ?, fecha_modificacion = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [cantidad_producida, merma_kg, observaciones, parametros, usuario_modificacion, id]
        );
    }
}

module.exports = RegistroTrabajoRepository;
