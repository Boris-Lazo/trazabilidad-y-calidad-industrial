// Repositorio para órdenes de producción
const sqlite = require('../../database/sqlite');

const findAll = async () => {
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
  return await sqlite.query(query);
};

const findById = async (id) => {
  return await sqlite.get('SELECT * FROM orden_produccion WHERE id = ?', [id]);
};

const create = async (data) => {
  const { codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion } = data;
  const result = await sqlite.run(
    'INSERT INTO orden_produccion (codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [codigo_orden, producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado || 'abierta', fecha_creacion || new Date().toISOString()]
  );
  return result.lastID;
};

const update = async (id, data) => {
  const { producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado } = data;
  await sqlite.run(
    'UPDATE orden_produccion SET producto = ?, cantidad_objetivo = ?, unidad = ?, fecha_planificada = ?, prioridad = ?, observaciones = ?, estado = ? WHERE id = ?',
    [producto, cantidad_objetivo, unidad, fecha_planificada, prioridad, observaciones, estado, id]
  );
};

const remove = async (id) => {
  await sqlite.run('DELETE FROM orden_produccion WHERE id = ?', [id]);
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove
};
