const sqlite = require('../../database/sqlite');

const findAll = async () => {
    return await sqlite.query('SELECT * FROM lineas_ejecucion');
};

const findByOrdenProduccionId = async (ordenId) => {
    return await sqlite.query('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ?', [ordenId]);
};

const findByOrdenAndProceso = async (ordenId, procesoId) => {
  return await sqlite.get('SELECT * FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_tipo_id = ?', [ordenId, procesoId]);
};

const create = async (ordenId, procesoId) => {
  const result = await sqlite.run('INSERT INTO lineas_ejecucion (orden_produccion_id, proceso_tipo_id, estado) VALUES (?, ?, ?)', [ordenId, procesoId, 'activo']);
  return result.lastID;
};

module.exports = { findAll, findByOrdenProduccionId, findByOrdenAndProceso, create };
