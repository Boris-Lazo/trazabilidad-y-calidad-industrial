// Repositorio para acceso a datos de usuarios
class AuthRepository {
  constructor(db) {
    this.db = db;
  }

  async findByUsername(username) {
    const sql = `
      SELECT u.*, p.nombre, p.apellido, r.nombre as rol
      FROM usuarios u
      LEFT JOIN personas p ON u.persona_id = p.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.username = ?
    `;
    return await this.db.get(sql, [username]);
  }

  async findById(id) {
    const sql = `
      SELECT u.*, p.nombre, p.apellido, r.nombre as rol
      FROM usuarios u
      LEFT JOIN personas p ON u.persona_id = p.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ?
    `;
    return await this.db.get(sql, [id]);
  }

  async updateLoginAttempts(userId, attempts, blockedAt = null) {
    const sql = 'UPDATE usuarios SET intentos_fallidos = ?, bloqueado_at = ? WHERE id = ?';
    return await this.db.run(sql, [attempts, blockedAt, userId]);
  }

  async resetLoginAttempts(userId) {
    const sql = 'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_at = NULL WHERE id = ?';
    return await this.db.run(sql, [userId]);
  }

  async updatePassword(userId, passwordHash) {
    const sql = `
      UPDATE usuarios
      SET password_hash = ?,
          must_change_password = 0,
          password_last_changed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await this.db.run(sql, [passwordHash, userId]);
  }
}

module.exports = AuthRepository;
