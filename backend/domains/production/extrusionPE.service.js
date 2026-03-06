const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError   = require('../../shared/errors/NotFoundError');

// Tolerancias definidas en el contrato
const TOLERANCIA_ANCHO  = 0.25; // pulgadas
const LECTURAS_POR_TURNO = 4;

class ExtrusionPEService {
    constructor(extrusionPERepository, lineaEjecucionRepository, loteService) {
        this.repo      = extrusionPERepository;
        this.lineaRepo = lineaEjecucionRepository;
        this.loteService = loteService;
    }

    // ── GET ────────────────────────────────────────────────────────────
    async getDetalle(bitacoraId, maquinaId) {
        // Si no se especifica máquina, devolver estado de ambas
        const maquinas = await this.repo.getMaquinas();

        if (maquinaId) {
            const maquina = await this.repo.getMaquinaById(maquinaId);
            return await this._getDetalleMaquina(bitacoraId, maquina);
        }

        // Sin maquinaId: devolver resumen de todas
        const detalles = await Promise.all(
            maquinas.map(m => this._getDetalleMaquina(bitacoraId, m))
        );
        return { maquinas: detalles };
    }

    async _getDetalleMaquina(bitacoraId, maquina) {
        const [estado, ultimoRegistro, rollos, muestras] = await Promise.all([
            this.repo.getEstadoMaquina(bitacoraId, maquina.id),
            this.repo.getUltimoRegistro(bitacoraId, maquina.id),
            this.repo.getRollosByBitacoraYMaquina(bitacoraId, maquina.id),
            this.repo.getMuestrasByBitacoraYMaquina(bitacoraId, maquina.id),
        ]);

        let loteTurno = null;
        if (ultimoRegistro?.orden_id) {
            loteTurno = await this.loteService.getByBitacoraYOrden(bitacoraId, ultimoRegistro.orden_id);
        }

        const totalKg = rollos.reduce((s, r) => s + (r.peso_kg || 0), 0);

        return {
            maquina,
            estado_proceso: estado?.estado || 'Sin datos',
            ultimo_registro: ultimoRegistro,
            rollos,
            total_kg: totalKg,
            muestras,
            lote_turno: loteTurno,
        };
    }

    // ── SAVE ───────────────────────────────────────────────────────────
    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            maquina_id,
            orden_id,
            rollos       = [],   // [{ codigo_rollo, peso_kg }]
            muestras     = [],   // [{ lectura_indice, espesor_mm, ancho_burbuja, microperforado }]
            merma_kg     = 0,
            materias_primas = [], // [{ tipo, marca, lote, porcentaje }]
            observaciones = '',
        } = data;

        const PROCESO_ID = 6;

        // ── Validaciones básicas ──────────────────────────────────────
        if (!maquina_id) throw new ValidationError('Debe seleccionar una máquina (EXTPE01 o EXTPE02).');
        if (!orden_id)   throw new ValidationError('Debe seleccionar una orden de producción.');

        const maquina = await this.repo.getMaquinaById(maquina_id);

        const codigoOrden = await this.repo.findOrdenCodigo(orden_id);
        if (!codigoOrden) throw new ValidationError(`La orden ID ${orden_id} no existe.`);
        if (!codigoOrden.startsWith('6'))
            throw new ValidationError(`La orden ${codigoOrden} no pertenece al proceso de Extrusión PE (debe iniciar con "6").`);

        const orden = await this.repo.getOrdenById(orden_id);
        if (orden?.estado === 'Cancelada')
            throw new ValidationError(`La orden ${codigoOrden} está cancelada.`);

        // ── Validar rollos ────────────────────────────────────────────
        for (const r of rollos) {
            if (!r.codigo_rollo?.trim())
                throw new ValidationError('Cada rollo debe tener un código.');
            if (!r.peso_kg || r.peso_kg <= 0)
                throw new ValidationError(`El rollo ${r.codigo_rollo} debe tener un peso mayor a 0 kg.`);
        }

        // ── Validar materias primas ────────────────────────────────────
        if (materias_primas.length > 0) {
            const suma = materias_primas.reduce((acc, mp) => acc + (mp.porcentaje || 0), 0);
            if (Math.abs(suma - 100) > 0.01)
                throw new ValidationError('La suma de porcentajes de materias primas debe ser exactamente 100%.');
        }

        // ── Validar muestras ──────────────────────────────────────────
        for (const m of muestras) {
            if (m.lectura_indice < 1 || m.lectura_indice > LECTURAS_POR_TURNO)
                throw new ValidationError(`lectura_indice debe estar entre 1 y ${LECTURAS_POR_TURNO}.`);
            if (m.espesor_mm == null || m.espesor_mm <= 0)
                throw new ValidationError(`Lectura ${m.lectura_indice}: el espesor debe ser mayor a 0.`);
            if (m.ancho_burbuja == null || m.ancho_burbuja <= 0)
                throw new ValidationError(`Lectura ${m.lectura_indice}: el ancho de burbuja debe ser mayor a 0.`);
            if (![true, false, 'true', 'false', 1, 0].includes(m.microperforado))
                throw new ValidationError(`Lectura ${m.lectura_indice}: microperforado debe ser true/false.`);
        }

        const especificaciones = JSON.parse(orden.especificaciones || '{}');

        return await this.repo.withTransaction(async () => {
            // ── Idempotencia: borrar previos ──────────────────────────
            await this.repo.deleteRollosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repo.deleteMuestrasByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repo.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);

            // ── Línea de ejecución ────────────────────────────────────
            let linea = await this.lineaRepo.findByOrdenAndProceso(orden_id, PROCESO_ID, maquina.id);
            if (!linea) {
                const lineaId = await this.lineaRepo.create(orden_id, PROCESO_ID, maquina.id);
                linea = { id: lineaId };
            }

            const totalKg = rollos.reduce((s, r) => s + r.peso_kg, 0);

            // ── Registro de trabajo ───────────────────────────────────
            const parametrosJSON = JSON.stringify({
                rollos_producidos: rollos.length,
                total_kg: totalKg,
                materias_primas,
                merma_kg,
                observaciones,
            });

            const registroId = await this.repo.saveRegistroTrabajo({
                cantidad_producida: totalKg,
                merma_kg,
                observaciones,
                parametros: parametrosJSON,
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id: maquina.id,
                usuario_modificacion: usuario,
            });

            // ── Guardar rollos ────────────────────────────────────────
            for (const r of rollos) {
                await this.repo.saveRollo({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    codigo_rollo: r.codigo_rollo.trim(),
                    peso_kg: r.peso_kg,
                    registro_trabajo_id: registroId,
                    usuario_modificacion: usuario,
                });
            }

            // ── Lote del turno ────────────────────────────────────────
            let loteTurno = await this.loteService.getByBitacoraYOrden(bitacora_id, orden_id);
            if (!loteTurno && totalKg > 0) {
                const count = await this.repo.getMaxCorrelativoLoteByOrden(orden_id);
                const correlativo = count + 1;
                const codigoMaquina = maquina.nombre_visible.replace(/[^A-Z0-9]/gi, '');
                const codigoLote = `${codigoOrden}-${codigoMaquina}-${String(correlativo).padStart(3, '0')}`;
                await this.loteService.crearLoteDirecto({
                    codigo_lote: codigoLote,
                    orden_produccion_id: orden_id,
                    bitacora_id,
                    correlativo,
                    fecha_produccion: new Date().toISOString().split('T')[0],
                }, usuario);
            }

            // ── Guardar muestras con evaluación automática ────────────
            const nominalEspesor = especificaciones.espesor_nominal ?? null;
            const nominalAncho   = especificaciones.ancho_burbuja_nominal ?? null;
            const requiereMicro  = especificaciones.microperforado ?? false;

            let hayDesviacion = false;

            for (const m of muestras) {
                // Evaluar espesor
                let espesorRes = 'Cumple';
                if (nominalEspesor !== null) {
                    // Tolerancia ±10% sobre el nominal de espesor (industria estándar)
                    const tol = nominalEspesor * 0.10;
                    if (Math.abs(m.espesor_mm - nominalEspesor) > tol) espesorRes = 'No cumple';
                }

                // Evaluar ancho burbuja
                let anchoRes = 'Cumple';
                if (nominalAncho !== null) {
                    if (Math.abs(m.ancho_burbuja - nominalAncho) > TOLERANCIA_ANCHO) anchoRes = 'No cumple';
                }

                // Evaluar microperforado
                const microVal = m.microperforado === true || m.microperforado === 'true' || m.microperforado === 1;
                if (requiereMicro && !microVal) hayDesviacion = true;
                if (espesorRes === 'No cumple' || anchoRes === 'No cumple') hayDesviacion = true;

                await this.repo.saveMuestra({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    lectura_indice: m.lectura_indice,
                    espesor_mm: m.espesor_mm,
                    ancho_burbuja: m.ancho_burbuja,
                    microperforado: microVal ? 1 : 0,
                    espesor_resultado: espesorRes,
                    ancho_resultado: anchoRes,
                    usuario_modificacion: usuario,
                });
            }

            // ── Estado ────────────────────────────────────────────────
            let estado = 'Sin datos';
            if (totalKg > 0 || muestras.length > 0 || merma_kg > 0) {
                estado = 'Parcial';
                const tieneRollos   = rollos.length > 0;
                const tiene4Lecturas = muestras.length >= LECTURAS_POR_TURNO;
                if (totalKg > 0 && tieneRollos && tiene4Lecturas) estado = 'Completo';
                if (hayDesviacion) estado = 'Con desviación';
            }

            await this.repo.saveEstadoMaquina(bitacora_id, maquina.id, estado, observaciones);

            return { registro_id: registroId, estado, total_kg: totalKg, rollos_guardados: rollos.length };
        });
    }
}

module.exports = ExtrusionPEService;