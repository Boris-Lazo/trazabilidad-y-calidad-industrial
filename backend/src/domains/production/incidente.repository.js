const sqlite = require('../../database/sqlite');

const findAll = async () => {
  return await sqlite.query('SELECT * FROM incidentes ORDER BY fecha_creacion DESC');
};

const findById = async (id) => {
    return await sqlite.get('SELECT * FROM incidentes WHERE id = ?', [id]);
};

const create = async (data) => {
  const { titulo, descripcion, severidad, linea_ejecucion_id } = data;
  const result = await sqlite.run(
    'INSERT INTO incidentes (titulo, descripcion, severidad, linea_ejecucion_id, fecha_creacion) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
    [titulo, descripcion, severidad, linea_ejecucion_id]
  );
  return result.lastID;
};

const update = async (id, data) => {
    const { titulo, descripcion, severidad, estado, accion_correctiva } = data;
    await sqlite.run(
        'UPDATE incidentes SET titulo = ?, descripcion = ?, severidad = ?, estado = ?, accion_correctiva = ?, fecha_cierre = ? WHERE id = ?',
        [titulo, descripcion, severidad, estado, accion_correctiva, estado === 'cerrado' ? new Date().toISOString() : null, id]
    );
};

module.exports = { findAll, findById, create, update };
