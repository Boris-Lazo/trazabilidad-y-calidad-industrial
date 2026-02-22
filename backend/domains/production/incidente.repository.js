class IncidenteRepository {
  constructor(db) {
    this.db = db;
  }

  async findAll() {
    return await this.db.query('SELECT * FROM incidentes ORDER BY fecha_creacion DESC');
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM incidentes WHERE id = ?', [id]);
  }

  async create(data) {
    const { titulo, descripcion, severidad, linea_ejecucion_id } = data;
    const result = await this.db.run(
      'INSERT INTO incidentes (titulo, descripcion, severidad, linea_ejecucion_id, fecha_creacion) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [titulo, descripcion, severidad, linea_ejecucion_id]
    );
    return result.lastID;
  }

  async update(id, data) {
    const { titulo, descripcion, severidad, estado, accion_correctiva } = data;
    await this.db.run(
      'UPDATE incidentes SET titulo = ?, descripcion = ?, severidad = ?, estado = ?, accion_correctiva = ?, fecha_cierre = ? WHERE id = ?',
      [titulo, descripcion, severidad, estado, accion_correctiva, estado === 'cerrado' ? new Date().toISOString() : null, id]
    );
  }
}

module.exports = IncidenteRepository;
