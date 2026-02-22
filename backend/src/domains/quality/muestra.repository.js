const sqlite = require('../../database/sqlite');

const findByLoteId = async (loteId) => {
  return await sqlite.query('SELECT * FROM muestras WHERE lote_id = ?', [loteId]);
};

const findById = async (id) => {
    return await sqlite.get('SELECT * FROM muestras WHERE id = ?', [id]);
};

const create = async (data) => {
  const { codigo_muestra, fecha_analisis, lote_id } = data;
  const result = await sqlite.run(
    'INSERT INTO muestras (codigo_muestra, fecha_analisis, lote_id) VALUES (?, ?, ?)',
    [codigo_muestra, fecha_analisis, lote_id]
  );
  return result.lastID;
};

module.exports = { findByLoteId, findById, create };
