const sqlite = require('../../database/sqlite');

const findByRegistroId = async (registroId) => {
  return await sqlite.query('SELECT * FROM CONSUMO WHERE registro_trabajo_id = ? ORDER BY timestamp_consumo DESC', [registroId]);
};

const findById = async (id) => {
    return await sqlite.get('SELECT * FROM CONSUMO WHERE id = ?', [id]);
};

const create = async (data) => {
  const { registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo } = data;
  const result = await sqlite.run(
    'INSERT INTO CONSUMO (registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo) VALUES (?, ?, ?, ?)',
    [registro_trabajo_id, recurso_id, cantidad_consumida, timestamp_consumo]
  );
  return result.lastID;
};

module.exports = { findByRegistroId, findById, create };
