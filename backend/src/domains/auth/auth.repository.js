// Repositorio para acceso a datos de usuarios
const sqlite = require('../../database/sqlite');

const findByUsername = async (username) => {
  return await sqlite.get('SELECT * FROM usuarios WHERE username = ?', [username]);
};

module.exports = {
  findByUsername
};
