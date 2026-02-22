// Repositorio para tipos de procesos industriales
const sqlite = require('../../database/sqlite');

const findAll = async () => {
  return await sqlite.query('SELECT * FROM PROCESO_TIPO WHERE activo = 1');
};

const findById = async (id) => {
  return await sqlite.get('SELECT * FROM PROCESO_TIPO WHERE id = ?', [id]);
};

module.exports = {
  findAll,
  findById
};
