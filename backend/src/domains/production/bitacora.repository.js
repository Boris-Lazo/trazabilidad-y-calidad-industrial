// Repositorio para bitácoras de turno y estados de proceso
const sqlite = require('../../database/sqlite');

const findActive = async () => {
  return await sqlite.get("SELECT * FROM bitacora_turno WHERE estado = 'EN CURSO'");
};

const findById = async (id) => {
  return await sqlite.get('SELECT * FROM bitacora_turno WHERE id = ?', [id]);
};

const create = async (data) => {
  const { turno, fecha_operativa, inspector, fuera_de_horario } = data;
  const result = await sqlite.run(
    'INSERT INTO bitacora_turno (turno, fecha_operativa, inspector, fuera_de_horario) VALUES (?, ?, ?, ?)',
    [turno, fecha_operativa, inspector, fuera_de_horario]
  );
  return result.lastID;
};

const close = async (id) => {
  await sqlite.run("UPDATE bitacora_turno SET estado = 'CERRADA', fecha_cierre = CURRENT_TIMESTAMP WHERE id = ?", [id]);
};

const getResumenProcesos = async () => {
  return await sqlite.query('SELECT * FROM PROCESO_TIPO WHERE activo = 1');
};

const getRegistrosByProceso = async (bitacoraId, procesoId) => {
  return await sqlite.query(`
    SELECT rt.*, op.codigo_orden, op.id as orden_id, pt.unidad_produccion as unidad
    FROM registros_trabajo rt
    LEFT JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
    LEFT JOIN PROCESO_TIPO pt ON le.proceso_tipo_id = pt.id
    LEFT JOIN orden_produccion op ON le.orden_produccion_id = op.id
    WHERE rt.bitacora_id = ? AND (le.proceso_tipo_id = ? OR rt.linea_ejecucion_id IS NULL)
  `, [bitacoraId, procesoId]);
};

const getMuestrasByProceso = async (bitacoraId, procesoId) => {
  return await sqlite.query('SELECT * FROM muestras WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
};

const getProcesoStatus = async (bitacoraId, procesoId) => {
  return await sqlite.get('SELECT * FROM bitacora_proceso_status WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
};

const deleteProcesoData = async (bitacoraId, procesoId) => {
    await sqlite.run(`
        DELETE FROM registros_trabajo
        WHERE bitacora_id = ?
        AND (linea_ejecucion_id IN (SELECT id FROM lineas_ejecucion WHERE proceso_tipo_id = ?) OR linea_ejecucion_id IS NULL)
    `, [bitacoraId, procesoId]);
    await sqlite.run('DELETE FROM muestras WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
    await sqlite.run('DELETE FROM bitacora_proceso_status WHERE bitacora_id = ? AND proceso_tipo_id = ?', [bitacoraId, procesoId]);
};

const saveProcesoStatus = async (bitacoraId, procesoId, no_operativo, motivo) => {
    await sqlite.run(`
        INSERT INTO bitacora_proceso_status (bitacora_id, proceso_tipo_id, no_operativo, motivo_no_operativo)
        VALUES (?, ?, ?, ?)
    `, [bitacoraId, procesoId, no_operativo ? 1 : 0, motivo]);
};

const getInspectores = async () => {
    return await sqlite.query("SELECT DISTINCT inspector FROM bitacora_turno UNION SELECT nombre FROM usuarios WHERE rol IN ('ADMIN', 'INSPECTOR')");
};

module.exports = {
  findActive,
  findById,
  create,
  close,
  getResumenProcesos,
  getRegistrosByProceso,
  getMuestrasByProceso,
  getProcesoStatus,
  deleteProcesoData,
  saveProcesoStatus,
  getInspectores
};
