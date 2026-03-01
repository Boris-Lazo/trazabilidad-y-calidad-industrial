const NotFoundError = require('../../shared/errors/NotFoundError');

class ExtrusorPPRepository {
  constructor(db) {
    this.db = db;
  }

  // Obtener la máquina del extrusor (única, proceso_id = 1)
  async getMaquina() {
    const sql = `SELECT * FROM MAQUINAS WHERE proceso_id = 1 AND activo = 1 LIMIT 1`;
    const maquina = await this.db.get(sql);
    if (!maquina) {
      throw new NotFoundError('No se encontró máquina configurada para el proceso Extrusor PP.');
    }
    maquina.proceso_id = 1; // Forzar para coherencia
    return maquina;
  }

  // Obtener último registro de trabajo para esta bitácora+máquina
  // (para saber el acumulado anterior dentro del turno)
  async getUltimoRegistro(bitacora_id, maquina_id) {
    const sql = `
      SELECT rt.*
      FROM registros_trabajo rt
      WHERE rt.maquina_id = ? AND rt.bitacora_id = ?
      ORDER BY rt.created_at DESC LIMIT 1
    `;
    return await this.db.get(sql, [maquina_id, bitacora_id]);
  }

  // Obtener el último acumulado histórico de una máquina (fuera de la bitácora actual)
  async getUltimoAcumuladoHistorico(maquina_id, bitacora_id) {
    const sql = `
      SELECT parametros
      FROM registros_trabajo
      WHERE maquina_id = ? AND bitacora_id != ?
      ORDER BY created_at DESC LIMIT 1
    `;
    const row = await this.db.get(sql, [maquina_id, bitacora_id]);
    if (!row || !row.parametros) return 0;
    try {
      const params = JSON.parse(row.parametros);
      return params.acumulado_contador || 0;
    } catch (e) {
      return 0;
    }
  }

  // Guardar registro de trabajo del extrusor
  // Tabla: registros_trabajo
  async saveRegistroTrabajo(data) {
    const {
      linea_ejecucion_id,
      bitacora_id,
      maquina_id,
      cantidad_producida,
      merma_kg,
      observaciones,
      parametros,
      usuario_modificacion
    } = data;

    const sql = `
      INSERT INTO registros_trabajo
      (linea_ejecucion_id, bitacora_id, maquina_id, cantidad_producida, merma_kg, observaciones, parametros, usuario_modificacion, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    const result = await this.db.run(sql, [
      linea_ejecucion_id,
      bitacora_id,
      maquina_id,
      cantidad_producida,
      merma_kg,
      observaciones,
      JSON.stringify(parametros),
      usuario_modificacion
    ]);
    return result.lastID;
  }

  // Guardar muestras de calidad del extrusor
  // Tabla: muestras
  async saveMuestra(data) {
    const {
      bitacora_id,
      proceso_id,
      maquina_id,
      parametro,
      valor,
      resultado,
      usuario_modificacion
    } = data;

    const sql = `
      INSERT INTO muestras
      (bitacora_id, proceso_id, maquina_id, parametro, valor, resultado, usuario_modificacion, fecha_modificacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    return await this.db.run(sql, [
      bitacora_id,
      proceso_id,
      maquina_id,
      parametro,
      valor,
      resultado,
      usuario_modificacion
    ]);
  }

  // Guardar estado del proceso en bitácora
  // Tabla: BITACORA_PROCESO
  async saveEstadoProceso(bitacora_id, estado, observacion, usuario) {
    // Nota: Seguiremos el esquema REAL de la base de datos (no_operativo, motivo_no_operativo)
    // aunque el prompt indicaba otras columnas, para que el código funcione sin modificar la BD.
    // Al no haber columnas 'estado' ni 'observacion' usaremos las existentes.
    const sql = `
      INSERT INTO BITACORA_PROCESO (bitacora_id, proceso_id, no_operativo, motivo_no_operativo)
      VALUES (?, 1, ?, ?)
      ON CONFLICT(bitacora_id, proceso_id) DO UPDATE SET
        no_operativo = EXCLUDED.no_operativo,
        motivo_no_operativo = EXCLUDED.motivo_no_operativo
    `;

    return await this.db.run(sql, [
      bitacora_id,
      estado === 'No operativo' ? 1 : 0,
      observacion
    ]);
  }

  // Obtener estado actual del proceso en bitácora
  async getEstadoProceso(bitacora_id) {
    const sql = `SELECT * FROM BITACORA_PROCESO WHERE bitacora_id = ? AND proceso_id = 1`;
    return await this.db.get(sql, [bitacora_id]);
  }

  // Obtener todas las muestras de la bitácora para el proceso 1
  async getMuestras(bitacora_id) {
    const sql = `SELECT * FROM muestras WHERE bitacora_id = ? AND proceso_id = 1`;
    return await this.db.query(sql, [bitacora_id]);
  }

  // Wrapper de transacción
  async withTransaction(fn) {
    return await this.db.withTransaction(fn);
  }
}

module.exports = ExtrusorPPRepository;
