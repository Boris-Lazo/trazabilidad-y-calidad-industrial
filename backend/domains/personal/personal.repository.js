const DatabaseError = require('../../shared/errors/DatabaseError');

class PersonalRepository {
  constructor(db) {
    this.db = db;
  }

  async getAllPersonas() {
    const sql = `
      SELECT p.*, a.nombre as area_nombre, r.nombre as rol_actual, u.estado_usuario,
             (SELECT 1 FROM persona_roles_operativos pro
              JOIN roles_operativos ro ON pro.rol_operativo_id = ro.id
              WHERE pro.persona_id = p.id AND pro.fecha_hasta IS NULL AND ro.nombre = 'Auxiliar'
              LIMIT 1) AND (u.estado_usuario = 'Activo') as es_auxiliar_activo
      FROM personas p
      JOIN areas a ON p.area_id = a.id
      LEFT JOIN usuarios u ON p.id = u.persona_id
      LEFT JOIN roles r ON u.rol_id = r.id
    `;
    return await this.db.query(sql);
  }

  async getPersonaById(id) {
    const sql = `
      SELECT p.*, a.nombre as area_nombre, r.id as rol_id, r.nombre as rol_actual, u.estado_usuario, u.username
      FROM personas p
      JOIN areas a ON p.area_id = a.id
      LEFT JOIN usuarios u ON p.id = u.persona_id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE p.id = ?
    `;
    return await this.db.get(sql, [id]);
  }

  async createPersona(personaData, tx) {
    const db = tx || this.db;
    const sql = `
      INSERT INTO personas (
        nombre, apellido, codigo_interno, area_id, email, telefono,
        fecha_ingreso, tipo_personal, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.run(sql, [
      personaData.nombre, personaData.apellido, personaData.codigo_interno,
      personaData.area_id, personaData.email, personaData.telefono,
      personaData.fecha_ingreso, personaData.tipo_personal, personaData.created_by
    ]);
    return result.lastID;
  }

  async updatePersona(id, updateData, tx) {
    const db = tx || this.db;
    const fields = [];
    const params = [];

    const allowedFields = ['nombre', 'apellido', 'email', 'telefono', 'estado_laboral', 'updated_by', 'motivo_cambio'];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE personas SET ${fields.join(', ')} WHERE id = ?`;
    return await db.run(sql, params);
  }

  async findUserByPersonaId(personaId) {
    return await this.db.get('SELECT * FROM usuarios WHERE persona_id = ?', [personaId]);
  }

  async findUserById(userId) {
    return await this.db.get('SELECT * FROM usuarios WHERE id = ?', [userId]);
  }

  async updateUserStatus(userId, status, updaterId, reason, tx) {
    const db = tx || this.db;
    const sql = `
      UPDATE usuarios
      SET estado_usuario = ?, updated_by = ?, motivo_cambio = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return await db.run(sql, [status, updaterId, reason, userId]);
  }

  async updateUserRole(personaId, roleId, updaterId, reason, tx) {
    const db = tx || this.db;

    // 1. Update current role in usuarios
    const sql = `
      UPDATE usuarios
      SET rol_id = ?, updated_by = ?, motivo_cambio = ?, updated_at = CURRENT_TIMESTAMP
      WHERE persona_id = ?
    `;
    await db.run(sql, [roleId, updaterId, reason, personaId]);

    // 2. Insert into historical table persona_roles
    // First deactivate old roles
    await db.run('UPDATE persona_roles SET activo = 0 WHERE persona_id = ?', [personaId]);

    // Then insert new one
    const sqlHist = `
      INSERT INTO persona_roles (persona_id, rol_id, asignado_por, motivo_cambio, activo)
      VALUES (?, ?, ?, ?, 1)
    `;
    return await db.run(sqlHist, [personaId, roleId, updaterId, reason]);
  }

  async createUser(userData, tx) {
    const db = tx || this.db;
    const sql = `
      INSERT INTO usuarios (
        persona_id, username, password_hash, rol_id, must_change_password, created_by, motivo_cambio
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return await db.run(sql, [
      userData.persona_id, userData.username, userData.password_hash,
      userData.rol_id, userData.must_change_password ? 1 : 0, userData.created_by,
      userData.motivo_cambio || 'Creación inicial'
    ]);
  }

  async assignRole(personaId, rolId, assignedBy, tx) {
    const db = tx || this.db;
    const sql = `
      UPDATE usuarios
      SET rol_id = ?, updated_by = ?, motivo_cambio = 'Asignación inicial', updated_at = CURRENT_TIMESTAMP
      WHERE persona_id = ?
    `;
    return await db.run(sql, [rolId, assignedBy, personaId]);
  }

  async getAreas() {
    return await this.db.query('SELECT * FROM areas ORDER BY nombre');
  }

  async getRoles() {
    return await this.db.query('SELECT * FROM roles ORDER BY nombre');
  }

  async getRoleHistory(personaId) {
    const sql = `
      SELECT pr.*, r.nombre as rol_nombre, p.nombre || ' ' || p.apellido as asignado_por_nombre
      FROM persona_roles pr
      JOIN roles r ON pr.rol_id = r.id
      LEFT JOIN personas p ON pr.asignado_por = p.id
      WHERE pr.persona_id = ?
      ORDER BY pr.fecha_asignacion DESC
    `;
    return await this.db.query(sql, [personaId]);
  }

  async assignOperation(assignmentData, tx) {
    const db = tx || this.db;
    const sql = `
      INSERT INTO asignaciones_operativas (
        persona_id, proceso_tipo_id, maquina_id, turno, permanente, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    return await db.run(sql, [
      assignmentData.persona_id, assignmentData.proceso_tipo_id,
      assignmentData.maquina_id, assignmentData.turno,
      assignmentData.permanente ? 1 : 0, assignmentData.created_by
    ]);
  }

  async getActiveAssignments(personaId) {
    const sql = `
      SELECT ao.*, pt.nombre as proceso_nombre, m.codigo as maquina_codigo
      FROM asignaciones_operativas ao
      JOIN PROCESO_TIPO pt ON ao.proceso_tipo_id = pt.id
      LEFT JOIN MAQUINAS m ON ao.maquina_id = m.id
      WHERE ao.persona_id = ? AND (ao.fecha_fin IS NULL OR ao.fecha_fin > CURRENT_TIMESTAMP)
    `;
    return await this.db.query(sql, [personaId]);
  }

  async findByCodigoInterno(codigo) {
    return await this.db.get('SELECT * FROM personas WHERE codigo_interno = ?', [codigo]);
  }

  async findByEmail(email) {
    return await this.db.get('SELECT * FROM personas WHERE email = ?', [email]);
  }

  async withTransaction(fn) {
    return await this.db.withTransaction(fn);
  }
}

module.exports = PersonalRepository;
