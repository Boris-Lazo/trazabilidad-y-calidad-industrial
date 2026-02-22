const sqlite = require('../../database/sqlite');

const findByOrdenId = async (ordenId) => {
  return await sqlite.query('SELECT * FROM lotes WHERE orden_produccion_id = ?', [ordenId]);
};

const findById = async (id) => {
    return await sqlite.get('SELECT * FROM lotes WHERE id = ?', [id]);
};

const create = async (data) => {
  const { codigo_lote, fecha_produccion, orden_produccion_id } = data;
  const result = await sqlite.run(
    'INSERT INTO lotes (codigo_lote, fecha_produccion, orden_produccion_id) VALUES (?, ?, ?)',
    [codigo_lote, fecha_produccion, orden_produccion_id]
  );
  return result.lastID;
};

module.exports = { findByOrdenId, findById, create };
