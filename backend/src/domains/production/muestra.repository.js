const sqlite = require('../../database/sqlite');

const create = async (data) => {
    const { parametro, valor, resultado, bitacora_id, proceso_tipo_id } = data;
    const result = await sqlite.run(
        'INSERT INTO muestras (parametro, valor, resultado, bitacora_id, proceso_tipo_id, fecha_analisis) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [parametro, valor, resultado, bitacora_id, proceso_tipo_id]
    );
    return result.lastID;
};

module.exports = { create };
