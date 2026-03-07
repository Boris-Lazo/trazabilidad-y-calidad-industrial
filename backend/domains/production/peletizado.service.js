const ValidationError = require('../../shared/errors/ValidationError');

const PESO_BOLSA_NOMINAL_KG = 25;
const INSPECCIONES = [
    { indice: 1, momento: 'inicio_turno', etiqueta: 'Inicio de turno' },
    { indice: 2, momento: 'cierre_turno', etiqueta: 'Cierre de turno' },
];

class PeletizadoService {
    constructor(peletizadoRepository, lineaEjecucionRepository, loteService) {
        this.repo      = peletizadoRepository;
        this.lineaRepo = lineaEjecucionRepository;
        this.loteService = loteService;
    }

    // ── GET ────────────────────────────────────────────────────────────
    async getDetalle(bitacoraId) {
        const maquina = await this.repo.getMaquina();
        const [estado, ultimoRegistro, inspecciones] = await Promise.all([
            this.repo.getEstadoMaquina(bitacoraId, maquina.id),
            this.repo.getUltimoRegistro(bitacoraId, maquina.id),
            this.repo.getInspeccionesByBitacora(bitacoraId, maquina.id),
        ]);

        let registroParseado = null;
        if (ultimoRegistro?.parametros) {
            try {
                registroParseado = JSON.parse(ultimoRegistro.parametros);
            } catch (_) {}
        }

        let loteTurno = null;
        if (ultimoRegistro?.orden_id) {
            loteTurno = await this.loteService.getByBitacoraYOrden(bitacoraId, ultimoRegistro.orden_id);
        }

        return {
            maquina,
            estado_proceso: estado?.estado || 'Sin datos',
            reporte_bolsas: registroParseado,
            orden_id: ultimoRegistro?.orden_id || null,
            inspecciones,
            lote_turno: loteTurno,
        };
    }

    // ── SAVE ───────────────────────────────────────────────────────────
    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            orden_id,
            bolsas_producidas,
            peso_real_kg,
            tipo_desperdicio_entrada = '',  // descripción del material que entró
            inspecciones    = [],           // [{ inspeccion_indice, color_pelet, tipo_material }]
            merma_kg        = 0,
            observaciones   = '',
        } = data;

        const PROCESO_ID = 8;

        // ── Validaciones ───────────────────────────────────────────────
        if (!orden_id) throw new ValidationError('Debe seleccionar una orden de producción.');

        const codigoOrden = await this.repo.findOrdenCodigo(orden_id);
        if (!codigoOrden) throw new ValidationError(`La orden ID ${orden_id} no existe.`);
        if (!codigoOrden.startsWith('8'))
            throw new ValidationError(`La orden ${codigoOrden} no pertenece al proceso de Peletizado (debe iniciar con "8").`);

        const orden = await this.repo.getOrdenById(orden_id);
        if (orden?.estado === 'Cancelada')
            throw new ValidationError(`La orden ${codigoOrden} está cancelada.`);

        if (bolsas_producidas !== null && bolsas_producidas !== undefined) {
            if (!Number.isInteger(Number(bolsas_producidas)) || Number(bolsas_producidas) < 0)
                throw new ValidationError('El número de bolsas debe ser un entero mayor o igual a 0.');
        }
        if (peso_real_kg !== null && peso_real_kg !== undefined) {
            if (Number(peso_real_kg) < 0)
                throw new ValidationError('El peso real no puede ser negativo.');
        }

        const maquina = await this.repo.getMaquina();

        return await this.repo.withTransaction(async () => {
            // ── Idempotencia ─────────────────────────────────────────
            await this.repo.deleteInspeccionesByBitacora(bitacora_id, maquina.id);
            await this.repo.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);

            // ── Cálculos del reporte de bolsas ────────────────────────
            const bolsas      = Number(bolsas_producidas) || 0;
            const pesoReal    = Number(peso_real_kg) || 0;
            const pesoTeorico = bolsas * PESO_BOLSA_NOMINAL_KG;
            const diferencia  = +(pesoReal - pesoTeorico).toFixed(2);

            // ── Línea de ejecución ────────────────────────────────────
            let linea = await this.lineaRepo.findByOrdenAndProceso(orden_id, PROCESO_ID, maquina.id);
            if (!linea) {
                const lineaId = await this.lineaRepo.create(orden_id, PROCESO_ID, maquina.id);
                linea = { id: lineaId };
            }

            // ── Registro de trabajo ───────────────────────────────────
            const parametrosJSON = JSON.stringify({
                bolsas_producidas: bolsas,
                peso_real_kg:      pesoReal,
                peso_teorico_kg:   pesoTeorico,
                diferencia_kg:     diferencia,
                tipo_desperdicio_entrada,
                merma_kg,
                observaciones,
            });

            const registroId = await this.repo.saveRegistroTrabajo({
                cantidad_producida: pesoReal,
                merma_kg,
                observaciones,
                parametros:           parametrosJSON,
                linea_ejecucion_id:   linea.id,
                bitacora_id,
                maquina_id:           maquina.id,
                usuario_modificacion: usuario,
            });

            // ── Lote ──────────────────────────────────────────────────
            let loteTurno = await this.loteService.getByBitacoraYOrden(bitacora_id, orden_id);
            if (!loteTurno && bolsas > 0) {
                const count = await this.repo.getMaxCorrelativoLoteByOrden(orden_id);
                const correlativo = count + 1;
                const codigoLote  = `${codigoOrden}-PELET-${String(correlativo).padStart(3, '0')}`;
                await this.loteService.crearLoteDirecto({
                    codigo_lote:        codigoLote,
                    orden_produccion_id: orden_id,
                    bitacora_id,
                    correlativo,
                    fecha_produccion: new Date().toISOString().split('T')[0],
                }, usuario);
            }

            // ── Inspecciones ──────────────────────────────────────────
            for (const insp of inspecciones) {
                const def = INSPECCIONES.find(d => d.indice === Number(insp.inspeccion_indice));
                await this.repo.saveInspeccion({
                    bitacora_id,
                    maquina_id:           maquina.id,
                    orden_id,
                    inspeccion_indice:    Number(insp.inspeccion_indice),
                    momento:              def?.momento || 'inicio_turno',
                    color_pelet:          insp.color_pelet   || '',
                    tipo_material:        insp.tipo_material  || '',
                    usuario_modificacion: usuario,
                });
            }

            // ── Estado ────────────────────────────────────────────────
            let estado = 'Sin datos';
            if (bolsas > 0 || pesoReal > 0 || inspecciones.length > 0) {
                estado = 'Parcial';
                const tieneProduccion    = bolsas > 0 && pesoReal > 0;
                const tiene2Inspecciones = inspecciones.length >= 2;
                if (tieneProduccion && tiene2Inspecciones) estado = 'Completo';
            }

            await this.repo.saveEstadoMaquina(bitacora_id, maquina.id, estado, observaciones);

            return {
                registro_id:   registroId,
                estado,
                bolsas_producidas: bolsas,
                peso_real_kg:  pesoReal,
                peso_teorico_kg: pesoTeorico,
                diferencia_kg: diferencia,
            };
        });
    }
}

module.exports = PeletizadoService;
