const DatabaseError = require('../../shared/errors/DatabaseError');

class GruposRepository {
  constructor(db) {
    this.db = db;
  }

  async getAllGrupos() {
    const sql = `SELECT * FROM grupos WHERE activo = 1 ORDER BY nombre`;
    return await this.db.query(sql);
  }

  async createGrupo(data) {
    const sql = `
      INSERT INTO grupos (nombre, tipo, turno_actual)
      VALUES (?, ?, ?)
    `;
    const result = await this.db.run(sql, [data.nombre, data.tipo, data.turno_actual]);
    return result.lastID;
  }

  async getGrupoById(id) {
    const sql = `SELECT * FROM grupos WHERE id = ?`;
    return await this.db.get(sql, [id]);
  }

  async getIntegrantesByGrupo(grupoId) {
    const sql = `
      SELECT gi.*, p.nombre, p.apellido, p.codigo_interno, p.rol_organizacional,
             (SELECT ro.nombre
              FROM persona_roles_operativos pro
              JOIN roles_operativos ro ON pro.rol_operativo_id = ro.id
              WHERE pro.persona_id = gi.persona_id AND pro.fecha_hasta IS NULL
              LIMIT 1) as rol_operativo
      FROM grupo_integrantes gi
      JOIN personas p ON gi.persona_id = p.id
      WHERE gi.grupo_id = ? AND gi.fecha_hasta IS NULL
    `;
    return await this.db.query(sql, [grupoId]);
  }

  async getHistorialIntegrantesByGrupo(grupoId) {
    const sql = `
      SELECT gi.*, p.nombre, p.apellido
      FROM grupo_integrantes gi
      JOIN personas p ON gi.persona_id = p.id
      WHERE gi.grupo_id = ?
      ORDER BY gi.fecha_desde DESC
    `;
    return await this.db.query(sql, [grupoId]);
  }

  async addIntegrante(data) {
    const sql = `
      INSERT INTO grupo_integrantes (grupo_id, persona_id, motivo, asignado_por)
      VALUES (?, ?, ?, ?)
    `;
    return await this.db.run(sql, [data.grupo_id, data.persona_id, data.motivo, data.asignado_por]);
  }

  async removeIntegrante(grupoId, personaId) {
    const sql = `
      UPDATE grupo_integrantes
      SET fecha_hasta = CURRENT_TIMESTAMP
      WHERE grupo_id = ? AND persona_id = ? AND fecha_hasta IS NULL
    `;
    return await this.db.run(sql, [grupoId, personaId]);
  }

  async getRolesOperativos() {
    return await this.db.query('SELECT * FROM roles_operativos WHERE activo = 1 ORDER BY nombre');
  }

  async getPersonaRolesOperativos(personaId) {
    const sql = `
      SELECT pro.*, ro.nombre as rol_nombre
      FROM persona_roles_operativos pro
      JOIN roles_operativos ro ON pro.rol_operativo_id = ro.id
      WHERE pro.persona_id = ?
      ORDER BY pro.fecha_desde DESC
    `;
    return await this.db.query(sql, [personaId]);
  }

  async assignRolOperativo(data) {
    // Close current role
    await this.db.run(
      'UPDATE persona_roles_operativos SET fecha_hasta = CURRENT_TIMESTAMP WHERE persona_id = ? AND fecha_hasta IS NULL',
      [data.persona_id]
    );
    // Add new role
    const sql = `
      INSERT INTO persona_roles_operativos (persona_id, rol_operativo_id, motivo, asignado_por)
      VALUES (?, ?, ?, ?)
    `;
    return await this.db.run(sql, [data.persona_id, data.rol_operativo_id, data.motivo, data.asignado_por]);
  }

  async updateTurnoGrupo(grupoId, nuevoTurno) {
    const sql = `UPDATE grupos SET turno_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    return await this.db.run(sql, [nuevoTurno, grupoId]);
  }

  async getPersonaGroupHistory(personaId) {
    const sql = `
      SELECT gi.*, g.nombre as grupo_nombre, g.tipo as grupo_tipo
      FROM grupo_integrantes gi
      JOIN grupos g ON gi.grupo_id = g.id
      WHERE gi.persona_id = ?
      ORDER BY gi.fecha_desde DESC
    `;
    return await this.db.query(sql, [personaId]);
  }

  async withTransaction(fn) {
    return await this.db.withTransaction(fn);
  }
}

module.exports = GruposRepository;
