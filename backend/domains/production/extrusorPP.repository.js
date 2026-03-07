const BaseProcesoRepository = require('./base/BaseProcesoRepository');

class ExtrusorPPRepository extends BaseProcesoRepository {
  constructor(db) {
    super(db, 1); // proceso_id = 1
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

  // Obtener todas las muestras de la bitácora para el proceso 1
  async getMuestras(bitacora_id) {
    const sql = `SELECT * FROM muestras WHERE bitacora_id = ? AND proceso_id = 1`;
    return await this.db.query(sql, [bitacora_id]);
  }
}

module.exports = ExtrusorPPRepository;
