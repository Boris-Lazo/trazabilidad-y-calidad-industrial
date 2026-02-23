class MuestraRepository {
    constructor(db) {
        this.db = db;
    }

    async create(data) {
        const { parametro, valor, resultado, bitacora_id, proceso_tipo_id, maquina_id, valor_nominal, usuario_modificacion } = data;
        const result = await this.db.run(
            'INSERT INTO muestras (parametro, valor, resultado, bitacora_id, proceso_tipo_id, maquina_id, valor_nominal, usuario_modificacion, fecha_modificacion, fecha_analisis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [parametro, valor, resultado, bitacora_id, proceso_tipo_id, maquina_id, valor_nominal, usuario_modificacion]
        );
        return result.lastID;
    }

    async update(id, data) {
        const { valor, resultado, usuario_modificacion } = data;
        return await this.db.run(
            'UPDATE muestras SET valor = ?, resultado = ?, usuario_modificacion = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?',
            [valor, resultado, usuario_modificacion, id]
        );
    }
}

module.exports = MuestraRepository;
