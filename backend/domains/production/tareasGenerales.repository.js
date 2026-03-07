class TareasGeneralesRepository {
    constructor(db) {
        this.db = db;
    }

    // Catálogo de tipos de tarea
    static TIPOS_TAREA = [
        'Limpieza de área',
        'Limpieza de máquina',
        'Reprocesamiento de material',
        'Recuperación de material',
        'Mantenimiento menor',
        'Apoyo a otro proceso',
        'Orden y clasificación',
        'Otro',
    ];

    async save(data) {
        const { bitacora_id, persona_id, tipo_tarea, area_maquina,
                tiempo_minutos, observaciones, usuario_modificacion } = data;
        const result = await this.db.run(`
            INSERT INTO tareas_generales
            (bitacora_id, persona_id, tipo_tarea, area_maquina,
             tiempo_minutos, observaciones, usuario_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bitacora_id, persona_id, tipo_tarea, area_maquina,
            tiempo_minutos, observaciones, usuario_modificacion]);
        return result.lastID;
    }

    async getByBitacora(bitacoraId) {
        return await this.db.query(`
            SELECT tg.*, p.nombre || ' ' || p.apellido AS persona_nombre
            FROM tareas_generales tg
            LEFT JOIN personas p ON tg.persona_id = p.id
            WHERE tg.bitacora_id = ?
            ORDER BY tg.created_at ASC
        `, [bitacoraId]);
    }

    async getById(id) {
        return await this.db.get(
            `SELECT * FROM tareas_generales WHERE id = ?`, [id]
        );
    }

    async update(id, data) {
        const { tipo_tarea, area_maquina, tiempo_minutos,
                observaciones, usuario_modificacion } = data;
        return await this.db.run(`
            UPDATE tareas_generales
            SET tipo_tarea = ?, area_maquina = ?, tiempo_minutos = ?,
                observaciones = ?, usuario_modificacion = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [tipo_tarea, area_maquina, tiempo_minutos,
            observaciones, usuario_modificacion, id]);
    }

    async delete(id) {
        return await this.db.run(
            `DELETE FROM tareas_generales WHERE id = ?`, [id]
        );
    }

    async withTransaction(fn) {
        return await this.db.withTransaction(fn);
    }
}

module.exports = TareasGeneralesRepository;
