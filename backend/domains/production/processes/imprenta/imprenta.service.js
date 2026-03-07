const BaseProcesoService = require('../base/BaseProcesoService');
const ValidationError = require('../../../../shared/errors/ValidationError');

class ImprentaService extends BaseProcesoService {
    constructor(imprentaRepository, lineaEjecucionRepository,
                registroTrabajoRepository, loteService, auditService) {
        // Base constructor: (repository, loteService, lineaEjecucionRepository, auditService, config)
        super(imprentaRepository, loteService, lineaEjecucionRepository, auditService, {
            procesoId: 4,
            digitoOrden: '4'
        });
    }

    async getDetalle(bitacoraId) {
        const baseDetalle = await super.getDetalle(bitacoraId);
        const maquinaId = baseDetalle.maquina.id;

        const rollosConsumidos = await this.repository.getConsumoRollosByBitacora(bitacoraId, maquinaId);
        const tintas = await this.repository.getTintasByBitacora(bitacoraId, maquinaId);
        const muestrasCalidad = await this.repository.getMuestrasCalidadByBitacora(bitacoraId, maquinaId);

        return {
            ...baseDetalle,
            rollos_consumidos: rollosConsumidos,
            tintas,
            muestras_calidad: muestrasCalidad
        };
    }

    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            orden_id,
            rollos = [],
            tintas = [],
            muestras = [],
            desperdicio_kg = 0,
            tipo_desperdicio = null,
            parametros_operativos = {},
            observaciones = ''
        } = data;

        const procesoId = this.config.procesoId;

        // ── Validaciones ──────────────────────────────────────────────────
        await this.validarOrden(orden_id);

        // 2. Validar rollos
        const impresionesTotales = rollos.reduce((acc, r) => acc + (r.impresiones_producidas || 0), 0);
        if (impresionesTotales > 0 && rollos.length === 0) {
            throw new ValidationError('Debe declarar al menos un rollo cuando hay producción.');
        }
        for (const r of rollos) {
            if (!r.codigo_rollo || r.codigo_rollo.trim() === '') {
                throw new ValidationError('El código de rollo no puede estar vacío.');
            }
            if (!r.metros_consumidos || r.metros_consumidos <= 0) {
                throw new ValidationError(`El rollo ${r.codigo_rollo} debe tener metros consumidos > 0.`);
            }
            if (!r.impresiones_producidas || r.impresiones_producidas <= 0) {
                throw new ValidationError(`El rollo ${r.codigo_rollo} debe tener impresiones producidas > 0.`);
            }
        }

        // 3. Validar adherencia: debe ser 'Pasa' o 'No pasa'
        for (const m of muestras) {
            if (m.parametro === 'adherencia_tinta' && !['Pasa', 'No pasa'].includes(m.resultado)) {
                throw new ValidationError('El resultado de adherencia debe ser "Pasa" o "No pasa".');
            }
        }

        // ── Transacción ───────────────────────────────────────────────────
        return await this.repository.withTransaction(async () => {
            const maquina = await this.repository.getMaquina();

            // Limpiar registros previos del turno (idempotente para todo excepto lotes)
            await this.repository.deleteConsumoRollosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteTintasByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteMuestrasCalidadByBitacoraYMaquina(bitacora_id, maquina.id);

            // a. Obtener/crear linea_ejecucion
            const linea = await this.obtenerOCrearLineaEjecucion(orden_id, maquina.id);

            // b. Guardar registro de trabajo
            const parametrosJSON = {
                impresiones_totales: impresionesTotales,
                tipo_desperdicio,
                ...parametros_operativos
            };

            const registroId = await this.repository.saveRegistroTrabajo({
                cantidad_producida: impresionesTotales,
                merma_kg: desperdicio_kg,
                observaciones,
                parametros: parametrosJSON,
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id: maquina.id,
                usuario_modificacion: usuario
            });

            // c. Guardar rollos + generar lote por rollo
            let correlativoImprenta = await this.repository.getMaxCorrelativoImprentaPorOrden(orden_id);

            for (const rollo of rollos) {
                const origen_proceso_id = rollo.codigo_rollo.includes('-L') ? 3 : 2;
                let existingLote = await this.repository.findLoteExistentePorRollo(orden_id, rollo.codigo_rollo);

                if (!existingLote) {
                    correlativoImprenta++;
                    const codigoLoteImprenta = `${rollo.codigo_rollo}-I${String(correlativoImprenta).padStart(3, '0')}`;

                    existingLote = await this.loteService.crearLoteDirecto({
                        codigo_lote:         codigoLoteImprenta,
                        orden_produccion_id: orden_id,
                        bitacora_id,
                        correlativo:         correlativoImprenta,
                        fecha_produccion:    new Date().toISOString().split('T')[0]
                    }, usuario);
                }

                await this.repository.saveConsumoRollo({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    codigo_rollo: rollo.codigo_rollo,
                    origen_proceso_id,
                    metros_consumidos: rollo.metros_consumidos,
                    impresiones_producidas: rollo.impresiones_producidas,
                    lote_id: existingLote.id,
                    registro_trabajo_id: registroId,
                    usuario_modificacion: usuario
                });
            }

            // d. Guardar tintas
            for (const t of tintas) {
                await this.repository.saveTinta({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    posicion: t.posicion,
                    numero_color: t.numero_color,
                    codigo_pantone: t.codigo_pantone,
                    tipo: t.tipo,
                    marca: t.marca,
                    lote: t.lote,
                    usuario_modificacion: usuario
                });
            }

            // e. Guardar muestras de calidad (calculando viscosidad)
            for (const m of muestras) {
                let finalResultado = m.resultado;
                if (m.parametro === 'viscosidad_tinta') {
                    finalResultado = (m.valor >= 19 && m.valor <= 25) ? 'Cumple' : 'No cumple';
                }

                await this.repository.saveMuestraCalidad({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    inspeccion_indice: m.inspeccion_indice,
                    parametro: m.parametro,
                    valor: m.valor,
                    resultado: finalResultado,
                    tinta_posicion: m.tinta_posicion,
                    tinta_numero_color: m.tinta_numero_color,
                    tinta_codigo_pantone: m.tinta_codigo_pantone,
                    usuario_modificacion: usuario
                });
            }

            // f. Calcular estado del proceso
            let estado = 'Sin datos';
            const tieneProduccion = impresionesTotales > 0;
            const tieneMuestras = muestras.length > 0;
            const tieneTintas = tintas.length > 0;

            if (tieneProduccion || desperdicio_kg > 0 || tieneMuestras || tieneTintas) {
                estado = 'Parcial';

                const numTintasActivas = tintas.length;
                const inspeccionesIndices = [...new Set(muestras.map(m => m.inspeccion_indice))];
                const tiene3Inspecciones = [1, 2, 3].every(i => inspeccionesIndices.includes(i));

                let muestrasPorTintaOk = true;
                if (numTintasActivas > 0) {
                    for (let i = 1; i <= 3; i++) {
                        const muestrasInspec = muestras.filter(m => m.inspeccion_indice === i);
                        const tintasEnMuestra = [...new Set(muestrasInspec.map(m => `${m.tinta_posicion}-${m.tinta_numero_color}`))];
                        if (tintasEnMuestra.length < numTintasActivas) {
                            muestrasPorTintaOk = false;
                            break;
                        }
                    }
                } else {
                    muestrasPorTintaOk = false;
                }

                if (rollos.length > 0 && tiene3Inspecciones && muestrasPorTintaOk && tieneTintas) {
                    estado = 'Completo';
                }

                const tieneDesviacion = muestras.some(m => {
                    if (m.parametro === 'viscosidad_tinta') {
                        const res = (m.valor >= 19 && m.valor <= 25) ? 'Cumple' : 'No cumple';
                        return res === 'No cumple';
                    }
                    if (m.parametro === 'adherencia_tinta') {
                        return m.resultado === 'No pasa';
                    }
                    return false;
                });

                if (tieneDesviacion) {
                    estado = 'Con desviación';
                }
            }

            await this.actualizarEstado(bitacora_id, maquina.id, estado, observaciones);

            return { registro_id: registroId, estado };
        });
    }
}

module.exports = ImprentaService;
