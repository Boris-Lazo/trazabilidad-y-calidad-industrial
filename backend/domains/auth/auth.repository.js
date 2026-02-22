// Repositorio para acceso a datos de usuarios
class AuthRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUsername(username) {
    return await this.db.get('SELECT * FROM usuarios WHERE username = ?', [username]);
  }
}

module.exports = AuthRepository;
