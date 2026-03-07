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

  async findByCodigoOrden(codigoOrden) {
    return await this.db.get('SELECT id, codigo_orden, estado FROM orden_produccion WHERE codigo_orden = ?', [codigoOrden]);
  }

  async create(data) {
    const {
      codigo_orden,
      producto,
      descripcion_producto,
      cantidad_objetivo,
      cantidad_planificada,
      unidad,
      fecha_planificada,
      fecha_vencimiento,
      prioridad,
      observaciones,
      estado,
      fecha_creacion,
      especificaciones
    } = data;

    const finalProducto = producto || descripcion_producto;
    const finalCantidad = cantidad_objetivo !== undefined ? cantidad_objetivo : cantidad_planificada;
    const finalFechaPlan = fecha_planificada || fecha_vencimiento;

    const result = await this.db.run(
      'INSERT INTO orden_produccion (codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion, especificaciones, origen, codigo_emergencia, vinculado_por, vinculado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        codigo_orden,
        finalProducto,
        finalCantidad,
        unidad || 'Unidades',
        finalFechaPlan,
        prioridad || 'Media',
        observaciones || '',
        estado || 'Liberada',
        fecha_creacion || new Date().toISOString(),
        typeof especificaciones === 'string' ? especificaciones : JSON.stringify(especificaciones),
        data.origen             || 'SAP',
        data.codigo_emergencia  || null,
        data.vinculado_por      || null,
        data.vinculado_en       || null,
      ]
    );
    return result.lastID;
  }

  async update(id, data) {
    const fields = [];
    const params = [];

    const allowedFields = ['producto', 'cantidad_objetivo', 'unidad', 'fecha_planificada', 'prioridad', 'observaciones', 'estado', 'especificaciones', 'motivo_cierre', 'origen', 'codigo_orden', 'codigo_emergencia', 'vinculado_por', 'vinculado_en'];

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

  async getUltimoNumeroEmergencia() {
    const row = await this.db.get(
      `SELECT codigo_orden FROM orden_produccion
       WHERE origen = 'EMERGENCIA' AND codigo_orden LIKE 'EM-%'
       ORDER BY id DESC LIMIT 1`
    );
    if (!row) return 0;
    const num = parseInt(row.codigo_orden.replace('EM-', '')) || 0;
    return num;
  }

  async remove(id) {
    await this.db.run('DELETE FROM orden_produccion WHERE id = ?', [id]);
  }
}

module.exports = OrdenProduccionRepository;
