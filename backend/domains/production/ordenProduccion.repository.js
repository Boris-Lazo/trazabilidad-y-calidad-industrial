// Repositorio para órdenes de producción
class OrdenProduccionRepository {
  constructor(db) {
    this.db = db;
  }

  async findAll(filters = {}) {
    let query = `
      SELECT
        op.*,
        COALESCE(SUM(rt.cantidad_producida), 0) as cantidad_producida,
        COALESCE(SUM(rt.merma_kg), 0) as merma_total
      FROM orden_produccion op
      LEFT JOIN lineas_ejecucion le ON op.id = le.orden_produccion_id
      LEFT JOIN registros_trabajo rt ON le.id = rt.linea_ejecucion_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.estado) {
      query += ` AND op.estado = ?`;
      params.push(filters.estado);
    }

    if (filters.proceso_prefix) {
      query += ` AND op.codigo_orden LIKE ?`;
      params.push(`${filters.proceso_prefix}%`);
    }

    query += `
      GROUP BY op.id
      ORDER BY op.fecha_creacion DESC
    `;
    return await this.db.query(query, params);
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM orden_produccion WHERE id = ?', [id]);
  }

  async create(data) {
    const { codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion, especificaciones } = data;
    const result = await this.db.run(
      'INSERT INTO orden_produccion (codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion, especificaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado || 'Creada', fecha_creacion || new Date().toISOString(), especificaciones]
    );
    return result.lastID;
  }

  async update(id, data) {
    const fields = [];
    const params = [];

    const allowedFields = ['producto', 'cantidad_objetivo', 'unidad', 'fecha_planificada', 'prioridad', 'observaciones', 'estado', 'especificaciones', 'motivo_cierre'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (fields.length === 0) return;

    params.push(id);
    const query = `UPDATE orden_produccion SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.run(query, params);
  }

  async remove(id) {
    await this.db.run('DELETE FROM orden_produccion WHERE id = ?', [id]);
  }
}

module.exports = OrdenProduccionRepository;
