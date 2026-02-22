// Repositorio para órdenes de producción
class OrdenProduccionRepository {
  constructor(db) {
    this.db = db;
  }

  async findAll() {
    const query = `
      SELECT
        op.*,
        COALESCE(SUM(rt.cantidad_producida), 0) as cantidad_producida,
        COALESCE(SUM(rt.merma_kg), 0) as merma_total
      FROM orden_produccion op
      LEFT JOIN lineas_ejecucion le ON op.id = le.orden_produccion_id
      LEFT JOIN registros_trabajo rt ON le.id = rt.linea_ejecucion_id
      GROUP BY op.id
      ORDER BY op.fecha_creacion DESC
    `;
    return await this.db.query(query);
  }

  async findById(id) {
    return await this.db.get('SELECT * FROM orden_produccion WHERE id = ?', [id]);
  }

  async create(data) {
    const { codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion } = data;
    const result = await this.db.run(
      'INSERT INTO orden_produccion (codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado || 'abierta', fecha_creacion || new Date().toISOString()]
    );
    return result.lastID;
  }

  async update(id, data) {
    const { producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado } = data;
    await this.db.run(
      'UPDATE orden_produccion SET producto = ?, cantidad_objetivo = ?, unidad = ?, fecha_planificada = ?, prioridad = ?, observaciones = ?, estado = ? WHERE id = ?',
      [producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, id]
    );
  }

  async remove(id) {
    await this.db.run('DELETE FROM orden_produccion WHERE id = ?', [id]);
  }
}

module.exports = OrdenProduccionRepository;
