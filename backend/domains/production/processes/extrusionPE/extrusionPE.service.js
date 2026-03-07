const BaseProcesoService = require('../base/BaseProcesoService');
const ValidationError = require('../../../../shared/errors/ValidationError');

const TOLERANCIA_ANCHO  = 0.25; // pulgadas
const LECTURAS_POR_TURNO = 4;

class ExtrusionPEService extends BaseProcesoService {
    constructor(extrusionPERepository, lineaEjecucionRepository, loteService, auditService) {
        // Base constructor: (repository, loteService, lineaEjecucionRepository, auditService, config)
        super(extrusionPERepository, loteService, lineaEjecucionRepository, auditService, {
            procesoId: 6,
            digitoOrden: '6'
        });
    }

    async getDetalle(bitacoraId, maquinaId) {
        const maquinas = await this.repository.getMaquinas();

        if (maquinaId) {
            const maquina = await this.repository.getMaquinaById(maquinaId);
            return await this._getDetalleMaquina(bitacoraId, maquina);
        }

        const detalles = await Promise.all(
            maquinas.map(m => this._getDetalleMaquina(bitacoraId, m))
        );
        return { maquinas: detalles };
    }

    async _getDetalleMaquina(bitacoraId, maquina) {
        const [estado, ultimoRegistro, rollos, muestras] = await Promise.all([
            this.repository.getEstadoMaquina(bitacoraId, maquina.id),
            this.repository.getUltimoRegistro(bitacoraId, maquina.id),
            this.repository.getRollosByBitacoraYMaquina(bitacoraId, maquina.id),
            this.repository.getMuestrasByBitacoraYMaquina(bitacoraId, maquina.id),
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

    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            maquina_id,
            orden_id,
            rollos       = [],
            muestras     = [],
            merma_kg     = 0,
            materias_primas = [],
            observaciones = '',
        } = data;

        const PROCESO_ID = this.config.procesoId;

        // ── Validaciones básicas ──────────────────────────────────────
        if (!maquina_id) throw new ValidationError('Debe seleccionar una máquina (EXTPE01 o EXTPE02).');
        await this.validarOrden(orden_id);
        const orden = await this.repository.getOrdenById(orden_id);

        const maquina = await this.repository.getMaquinaById(maquina_id);

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

        return await this.repository.withTransaction(async () => {
            // ── Idempotencia: borrar previos ──────────────────────────
            await this.repository.deleteRollosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteMuestrasByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);

            // ── Línea de ejecución ────────────────────────────────────
            const linea = await this.obtenerOCrearLineaEjecucion(orden_id, maquina.id);

            const totalKg = rollos.reduce((s, r) => s + r.peso_kg, 0);

            // ── Registro de trabajo ───────────────────────────────────
            const parametrosJSON = {
                rollos_producidos: rollos.length,
                total_kg: totalKg,
                materias_primas,
                merma_kg,
                observaciones,
            };

            const registroId = await this.repository.saveRegistroTrabajo({
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
                await this.repository.saveRollo({
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
                const count = await this.repository.getMaxCorrelativoLoteByOrden(orden_id);
                const correlativo = count + 1;
                const codigoMaquina = maquina.nombre_visible.replace(/[^A-Z0-9]/gi, '');
                const codigoLote = `${orden.codigo_orden}-${codigoMaquina}-${String(correlativo).padStart(3, '0')}`;
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
                let espesorRes = 'Cumple';
                if (nominalEspesor !== null) {
                    const tol = nominalEspesor * 0.10;
                    if (Math.abs(m.espesor_mm - nominalEspesor) > tol) espesorRes = 'No cumple';
                }

                let anchoRes = 'Cumple';
                if (nominalAncho !== null) {
                    if (Math.abs(m.ancho_burbuja - nominalAncho) > TOLERANCIA_ANCHO) anchoRes = 'No cumple';
                }

                const microVal = m.microperforado === true || m.microperforado === 'true' || m.microperforado === 1;
                if (requiereMicro && !microVal) hayDesviacion = true;
                if (espesorRes === 'No cumple' || anchoRes === 'No cumple') hayDesviacion = true;

                await this.repository.saveMuestra({
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

            await this.actualizarEstado(bitacora_id, maquina.id, estado, observaciones);

            return { registro_id: registroId, estado, total_kg: totalKg, rollos_guardados: rollos.length };
        });
    }
}

module.exports = ExtrusionPEService;
