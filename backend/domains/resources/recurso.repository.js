const sqlite = require('../../database/sqlite');

const findAll = async () => {
  return await sqlite.query('SELECT * FROM RECURSO ORDER BY nombre ASC');
};

const findById = async (id) => {
  return await sqlite.get('SELECT * FROM RECURSO WHERE id = ?', [id]);
};

const create = async (data) => {
  const { codigo, nombre, descripcion, tipo, unidad_medida } = data;
  const result = await sqlite.run(
    'INSERT INTO RECURSO (codigo, nombre, descripcion, tipo, unidad_medida) VALUES (?, ?, ?, ?, ?)',
    [codigo, nombre, descripcion, tipo, unidad_medida]
  );
  return result.lastID;
};

module.exports = { findAll, findById, create };
