const DatabaseError = require('../../shared/errors/DatabaseError');

class BootstrapRepository {
  constructor(db) {
    this.db = db;
  }

  async getSystemStatus() {
    const sql = "SELECT valor FROM sistema_config WHERE clave = 'estado_sistema'";
    const row = await this.db.get(sql);
    return row ? row.valor : 'NO_INICIALIZADO';
  }

  async setSystemStatus(status, tx) {
    const db = tx || this.db;
    const sql = "UPDATE sistema_config SET valor = ? WHERE clave = 'estado_sistema'";
    return await db.run(sql, [status]);
  }

  async createInitialAdmin(personaData, userData, tx) {
    const db = tx || this.db;

    // 1. Crear Persona
    const personaSql = `
      INSERT INTO personas (
        nombre, apellido, codigo_interno, area_id, email, telefono,
        tipo_personal, created_by, motivo_cambio
      ) VALUES (?, ?, ?, ?, ?, ?, 'administrativo', 'SYSTEM_BOOTSTRAP', 'Inicialización del sistema')
    `;
    const personaResult = await db.run(personaSql, [
      personaData.nombre, personaData.apellido, personaData.codigo_interno,
      personaData.area_id, personaData.email, personaData.telefono
    ]);
    const personaId = personaResult.lastID;

    // 2. Crear Usuario
    const userSql = `
      INSERT INTO usuarios (
        persona_id, username, password_hash, rol_id, must_change_password,
        estado_usuario, created_by, motivo_cambio
      ) VALUES (?, ?, ?, ?, 0, 'Activo', 'SYSTEM_BOOTSTRAP', 'Inicialización del sistema')
    `;
    const userResult = await db.run(userSql, [
      personaId, userData.username, userData.password_hash, userData.rol_id
    ]);

    return { personaId, usuarioId: userResult.lastID };
  }

  async getAreas() {
    return await this.db.query('SELECT id, nombre FROM areas ORDER BY nombre');
  }

  async getAdminRoleId() {
    const row = await this.db.get("SELECT id FROM roles WHERE nombre = 'Administrador'");
    return row ? row.id : null;
  }

  async withTransaction(fn) {
    return await this.db.withTransaction(fn);
  }
}

module.exports = BootstrapRepository;
