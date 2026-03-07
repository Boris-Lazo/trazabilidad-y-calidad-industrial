const NotFoundError = require('../../../shared/errors/NotFoundError');

class BaseProcesoRepository {
  constructor(db, procesoId) {
    this.db = db;
    this.procesoId = procesoId;
  }

  async getMaquina() {
    const sql = `SELECT * FROM MAQUINAS WHERE proceso_id = ? AND activo = 1 LIMIT 1`;
    const maquina = await this.db.get(sql, [this.procesoId]);
    if (!maquina) {
      throw new NotFoundError(`No se encontró máquina configurada para el proceso ID ${this.procesoId}.`);
    }
    return maquina;
  }

  async findOrdenCodigo(ordenId) {
    const sql = `SELECT codigo_orden FROM orden_produccion WHERE id = ?`;
    const row = await this.db.get(sql, [ordenId]);
    return row ? row.codigo_orden : null;
  }

  async getOrdenById(ordenId) {
    const sql = `SELECT * FROM orden_produccion WHERE id = ?`;
    return await this.db.get(sql, [ordenId]);
  }

  async getUltimoRegistro(bitacoraId, maquinaId) {
    const sql = `
      SELECT rt.*, le.orden_produccion_id as orden_id
      FROM registros_trabajo rt
      LEFT JOIN lineas_ejecucion le ON rt.linea_ejecucion_id = le.id
      WHERE rt.maquina_id = ? AND rt.bitacora_id = ?
      ORDER BY rt.created_at DESC LIMIT 1
    `;
    return await this.db.get(sql, [maquinaId, bitacoraId]);
  }

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
      typeof parametros === 'string' ? parametros : JSON.stringify(parametros),
      usuario_modificacion
    ]);
    return result.lastID;
  }

  async saveEstadoMaquina(bitacoraId, maquinaId, estado, observacion) {
    const sql = `
      INSERT INTO bitacora_maquina_status (bitacora_id, maquina_id, estado, observacion_advertencia)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(bitacora_id, maquina_id) DO UPDATE SET
        estado = EXCLUDED.estado,
        observacion_advertencia = EXCLUDED.observacion_advertencia
    `;
    return await this.db.run(sql, [bitacoraId, maquinaId, estado, observacion]);
  }

  async getEstadoMaquina(bitacoraId, maquinaId) {
    const sql = `SELECT * FROM bitacora_maquina_status WHERE bitacora_id = ? AND maquina_id = ?`;
    return await this.db.get(sql, [bitacoraId, maquinaId]);
  }

  async withTransaction(fn) {
    return await this.db.withTransaction(fn);
  }
}

module.exports = BaseProcesoRepository;
