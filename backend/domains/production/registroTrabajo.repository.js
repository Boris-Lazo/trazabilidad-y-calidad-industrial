const sqlite = require('../../database/sqlite');

const findAll = async () => {
    return await sqlite.query('SELECT * FROM registros_trabajo');
};

const findByLineaEjecucionId = async (lineaId) => {
    return await sqlite.query('SELECT * FROM registros_trabajo WHERE linea_ejecucion_id = ?', [lineaId]);
};

const create = async (data) => {
  const { cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id } = data;
  const result = await sqlite.run(
    'INSERT INTO registros_trabajo (cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id, fecha_hora) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id]
  );
  return result.lastID;
};

module.exports = { findAll, findByLineaEjecucionId, create };
