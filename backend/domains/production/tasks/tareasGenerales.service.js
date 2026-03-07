const ValidationError = require('../../../shared/errors/ValidationError');
const NotFoundError   = require('../../../shared/errors/NotFoundError');
const TareasGeneralesRepository = require('./tareasGenerales.repository');

class TareasGeneralesService {
    constructor(tareasRepository) {
        this.repo = tareasRepository;
    }

    // ── GET todas las tareas de una bitácora ──────────────────────────
    async getByBitacora(bitacoraId) {
        const tareas = await this.repo.getByBitacora(bitacoraId);
        const totalMinutos = tareas.reduce((s, t) => s + (t.tiempo_minutos || 0), 0);
        return {
            tareas,
            total_minutos: totalMinutos,
            tipos_disponibles: TareasGeneralesRepository.TIPOS_TAREA,
        };
    }

    // ── CREAR una tarea ───────────────────────────────────────────────
    async crear(data, usuario) {
        const { bitacora_id, tipo_tarea, area_maquina,
                tiempo_minutos, observaciones } = data;

        this._validar(data);

        const id = await this.repo.save({
            bitacora_id,
            persona_id:   data.persona_id || null,
            tipo_tarea:   tipo_tarea.trim(),
            area_maquina: area_maquina?.trim() || '',
            tiempo_minutos: Number(tiempo_minutos) || 0,
            observaciones:  observaciones?.trim() || '',
            usuario_modificacion: usuario,
        });

        return { id, mensaje: 'Tarea registrada correctamente.' };
    }

    // ── EDITAR una tarea ──────────────────────────────────────────────
    async editar(id, data, usuario) {
        const existente = await this.repo.getById(id);
        if (!existente) throw new NotFoundError(`Tarea ID ${id} no encontrada.`);

        this._validar(data);

        await this.repo.update(id, {
            tipo_tarea:    data.tipo_tarea.trim(),
            area_maquina:  data.area_maquina?.trim() || '',
            tiempo_minutos: Number(data.tiempo_minutos) || 0,
            observaciones:  data.observaciones?.trim() || '',
            usuario_modificacion: usuario,
        });

        return { id, mensaje: 'Tarea actualizada correctamente.' };
    }

    // ── ELIMINAR una tarea ────────────────────────────────────────────
    async eliminar(id) {
        const existente = await this.repo.getById(id);
        if (!existente) throw new NotFoundError(`Tarea ID ${id} no encontrada.`);
        await this.repo.delete(id);
        return { mensaje: 'Tarea eliminada.' };
    }

    // ── Validaciones compartidas ──────────────────────────────────────
    _validar(data) {
        if (!data.bitacora_id && !data.id)
            throw new ValidationError('El ID de bitácora es obligatorio.');
        if (!data.tipo_tarea?.trim())
            throw new ValidationError('El tipo de tarea es obligatorio.');
        if (data.tiempo_minutos !== undefined && data.tiempo_minutos !== null) {
            if (Number(data.tiempo_minutos) < 0)
                throw new ValidationError('El tiempo no puede ser negativo.');
        }
    }
}

module.exports = TareasGeneralesService;
