const BaseProcesoService = require('./base/BaseProcesoService');
const ValidationError = require('../../shared/errors/ValidationError');

const PESO_BOLSA_NOMINAL_KG = 25;
const INSPECCIONES = [
    { indice: 1, momento: 'inicio_turno', etiqueta: 'Inicio de turno' },
    { indice: 2, momento: 'cierre_turno', etiqueta: 'Cierre de turno' },
];

class PeletizadoService extends BaseProcesoService {
    constructor(peletizadoRepository, lineaEjecucionRepository, loteService, auditService) {
        // Base constructor: (repository, loteService, lineaEjecucionRepository, auditService, config)
        super(peletizadoRepository, loteService, lineaEjecucionRepository, auditService, {
            procesoId: 8,
            digitoOrden: '8'
        });
    }

    async getDetalle(bitacoraId) {
        const baseDetalle = await super.getDetalle(bitacoraId);
        const maquinaId = baseDetalle.maquina.id;
        const inspecciones = await this.repository.getInspeccionesByBitacora(bitacoraId, maquinaId);

        let registroParseado = null;
        if (baseDetalle.ultimo_registro?.parametros) {
            try {
                registroParseado = JSON.parse(baseDetalle.ultimo_registro.parametros);
            } catch (_) {}
        }

        return {
            ...baseDetalle,
            reporte_bolsas: registroParseado,
            orden_id: baseDetalle.ultimo_registro?.orden_id || null,
            inspecciones,
            lote_turno: baseDetalle.lote,
        };
    }

    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            orden_id,
            bolsas_producidas,
            peso_real_kg,
            tipo_desperdicio_entrada = '',
            inspecciones    = [],
            merma_kg        = 0,
            observaciones   = '',
        } = data;

        const PROCESO_ID = this.config.procesoId;

        // ── Validaciones ───────────────────────────────────────────────
        await this.validarOrden(orden_id);
        const orden = await this.repository.getOrdenById(orden_id);

        if (bolsas_producidas !== null && bolsas_producidas !== undefined) {
            if (!Number.isInteger(Number(bolsas_producidas)) || Number(bolsas_producidas) < 0)
                throw new ValidationError('El número de bolsas debe ser un entero mayor o igual a 0.');
        }
        if (peso_real_kg !== null && peso_real_kg !== undefined) {
            if (Number(peso_real_kg) < 0)
                throw new ValidationError('El peso real no puede ser negativo.');
        }

        const maquina = await this.repository.getMaquina();

        return await this.repository.withTransaction(async () => {
            // ── Idempotencia ─────────────────────────────────────────
            await this.repository.deleteInspeccionesByBitacora(bitacora_id, maquina.id);
            await this.repository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);

            // ── Cálculos del reporte de bolsas ────────────────────────
            const bolsas      = Number(bolsas_producidas) || 0;
            const pesoReal    = Number(peso_real_kg) || 0;
            const pesoTeorico = bolsas * PESO_BOLSA_NOMINAL_KG;
            const diferencia  = +(pesoReal - pesoTeorico).toFixed(2);

            // ── Línea de ejecución ────────────────────────────────────
            const linea = await this.obtenerOCrearLineaEjecucion(orden_id, maquina.id);

            // ── Registro de trabajo ───────────────────────────────────
            const parametrosJSON = {
                bolsas_producidas: bolsas,
                peso_real_kg:      pesoReal,
                peso_teorico_kg:   pesoTeorico,
                diferencia_kg:     diferencia,
                tipo_desperdicio_entrada,
                merma_kg,
                observaciones,
            };

            const registroId = await this.repository.saveRegistroTrabajo({
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
                const count = await this.repository.getMaxCorrelativoLoteByOrden(orden_id);
                const correlativo = count + 1;
                const codigoLote  = `${orden.codigo_orden}-PELET-${String(correlativo).padStart(3, '0')}`;
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
                await this.repository.saveInspeccion({
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

            await this.actualizarEstado(bitacora_id, maquina.id, estado, observaciones);

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
