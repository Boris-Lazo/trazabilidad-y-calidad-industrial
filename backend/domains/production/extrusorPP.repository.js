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

  // Obtener la orden por ID (para evitar atravesar otros servicios/repositorios)
  async getOrdenById(ordenId) {
    const sql = `SELECT * FROM orden_produccion WHERE id = ?`;
    return await this.db.get(sql, [ordenId]);
  }

  // Obtener el código de la orden
  async findOrdenCodigo(ordenId) {
    const sql = `SELECT codigo_orden FROM orden_produccion WHERE id = ?`;
    const row = await this.db.get(sql, [ordenId]);
    return row ? row.codigo_orden : null;
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

  // Guardar estado de la máquina en la bitácora (donde reside el estado real: Parcial, Completo, etc.)
  async saveEstadoMaquina(bitacora_id, maquina_id, estado, observacion) {
    const sql = `
      INSERT INTO bitacora_maquina_status (bitacora_id, maquina_id, estado, observacion_advertencia)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(bitacora_id, maquina_id) DO UPDATE SET
        estado = EXCLUDED.estado,
        observacion_advertencia = EXCLUDED.observacion_advertencia
    `;
    return await this.db.run(sql, [bitacora_id, maquina_id, estado, observacion]);
  }

  // Obtener estado actual de la máquina en la bitácora
  async getEstadoMaquina(bitacora_id, maquina_id) {
    const sql = `SELECT * FROM bitacora_maquina_status WHERE bitacora_id = ? AND maquina_id = ?`;
    return await this.db.get(sql, [bitacora_id, maquina_id]);
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
