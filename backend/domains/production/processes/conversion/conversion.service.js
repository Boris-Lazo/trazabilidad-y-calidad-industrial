const BaseProcesoService = require('../base/BaseProcesoService');
const ValidationError = require('../../../../shared/errors/ValidationError');

class ConversionService extends BaseProcesoService {
    constructor(conversionRepository, lineaEjecucionRepository,
                registroTrabajoRepository, loteService, auditService) {
        // Base constructor: (repository, loteService, lineaEjecucionRepository, auditService, config)
        super(conversionRepository, loteService, lineaEjecucionRepository, auditService, {
            procesoId: 5,
            digitoOrden: '5'
        });
    }

    async getResumen(bitacoraId) {
        const maquinas = await this.repository.getMaquinasByProceso();
        const estados = await this.repository.getEstadosMaquinasByBitacora(bitacoraId);

        return await Promise.all(maquinas.map(async (m) => {
            const estadoData = estados.find(e => e.maquina_id === m.id);
            const rollos = await this.repository.getConsumoRollosByBitacoraYMaquina(bitacoraId, m.id);
            const sacosTotal = rollos.reduce((acc, r) => acc + (r.sacos_producidos || 0), 0);

            const muestras = await this.repository.getMuestrasCalidadByBitacoraYMaquina(bitacoraId, m.id);
            const tieneDesviacion = muestras.some(mu => mu.resultado === 'No cumple');

            return {
                maquina: { id: m.id, nombre_visible: m.nombre_visible },
                estado_proceso: estadoData ? estadoData.estado : 'Sin datos',
                sacos_total: sacosTotal,
                tiene_desviacion: tieneDesviacion
            };
        }));
    }

    async getDetalle(bitacoraId, maquinaId) {
        const maquina = await this.repository.getMaquinaById(maquinaId);
        const estadoMaquina = await this.repository.getEstadoMaquina(bitacoraId, maquinaId);
        const ultimoRegistro = await this.repository.getUltimoRegistro(bitacoraId, maquinaId);
        const rollos = await this.repository.getConsumoRollosByBitacoraYMaquina(bitacoraId, maquinaId);
        const muestrasCalidad = await this.repository.getMuestrasCalidadByBitacoraYMaquina(bitacoraId, maquinaId);

        let mFisica = null;
        if (ultimoRegistro && ultimoRegistro.orden_id) {
            mFisica = await this.repository.getMuestraFisicaByOrdenYBitacora(ultimoRegistro.orden_id, bitacoraId);
        }

        const defectos = await this.repository.getDefectosByBitacoraYMaquina(bitacoraId, maquinaId);

        return {
            maquina,
            estado_proceso: estadoMaquina ? estadoMaquina.estado : 'Sin datos',
            ultimo_registro: ultimoRegistro,
            rollos_consumidos: rollos,
            muestras_calidad: muestrasCalidad,
            muestra_fisica: mFisica,
            defectos
        };
    }

    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            orden_id,
            maquina_id,
            rollos = [],
            muestras = [],
            muestra_fisica = null,
            defectos = [],
            desperdicio_kg = 0,
            destino_desperdicio = null,
            observaciones = ''
        } = data;

        const procesoId = this.config.procesoId;

        // ── Validaciones ──────────────────────────────────────────────────
        await this.validarOrden(orden_id);
        const orden = await this.repository.getOrdenById(orden_id);

        const maquina = await this.repository.getMaquinaById(maquina_id);

        // 3. REGLA DURA DE ASIGNACIÓN (CONV#03)
        if (maquina.codigo === 'CONV03') {
            const especificaciones = JSON.parse(orden.especificaciones || '{}');
            if (especificaciones.con_fuelle === true || especificaciones.microperforado === true) {
                throw new ValidationError('La máquina CONV#03 no está disponible para sacos con fuelle o microperforados.');
            }
        }

        // 4. Validar rollos
        const sacosTotal = rollos.reduce((acc, r) => acc + (r.sacos_producidos || 0), 0);
        if (sacosTotal > 0 && rollos.length === 0) {
            throw new ValidationError('Debe declarar al menos un rollo cuando hay producción.');
        }
        for (const r of rollos) {
            if (!r.codigo_rollo || r.codigo_rollo.trim() === '') {
                throw new ValidationError('El código de rollo no puede estar vacío.');
            }
            if (!r.sacos_producidos || r.sacos_producidos <= 0) {
                throw new ValidationError(`El rollo ${r.codigo_rollo} debe tener sacos producidos > 0.`);
            }
        }

        // 6. Validar defectos
        for (const d of defectos) {
            if (!['DEF-TELAR', 'DEF-IMPRENTA', 'DEF-LAMINADO'].includes(d.origen_id)) {
                throw new ValidationError(`Origen de defecto inválido: ${d.origen_id}`);
            }
            if (!d.descripcion_defecto || d.descripcion_defecto.trim().length < 10) {
                throw new ValidationError('La descripción del defecto debe tener al menos 10 caracteres.');
            }
            if (!d.cantidad_sacos_afectados || d.cantidad_sacos_afectados <= 0) {
                throw new ValidationError('La cantidad de sacos afectados debe ser mayor a 0.');
            }
        }

        // ── Transacción ───────────────────────────────────────────────────
        return await this.repository.withTransaction(async () => {
            // Limpiar registros previos (Idempotencia)
            await this.repository.deleteConsumoRollosByBitacoraYMaquina(bitacora_id, maquina_id);
            await this.repository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina_id);
            await this.repository.deleteMuestrasCalidadByBitacoraYMaquina(bitacora_id, maquina_id);
            await this.repository.deleteMuestraFisicaByBitacoraYMaquina(bitacora_id, maquina_id);
            await this.repository.deleteDefectosByBitacoraYMaquina(bitacora_id, maquina_id);

            // a. Obtener/crear linea_ejecucion
            const linea = await this.obtenerOCrearLineaEjecucion(orden_id, maquina_id);

            // b. Guardar registro de trabajo
            const parametrosJSON = {
                sacos_total,
                destino_desperdicio,
                observaciones
            };

            const registroId = await this.repository.saveRegistroTrabajo({
                cantidad_producida: sacosTotal,
                merma_kg: desperdicio_kg,
                observaciones,
                parametros: parametrosJSON,
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id,
                usuario_modificacion: usuario
            });

            // d. Para cada rollo: generar/reusar lote
            let correlativoConversion = await this.repository.getMaxCorrelativoConversionPorOrden(orden_id);
            for (const rollo of rollos) {
                let existingLote = await this.repository.findLoteExistentePorRollo(orden_id, rollo.codigo_rollo);

                if (!existingLote) {
                    correlativoConversion++;
                    const codigoLoteConversion = `${rollo.codigo_rollo}-C${String(correlativoConversion).padStart(3, '0')}`;

                    const newLoteId = await this.loteService.crearLoteDirecto({
                        codigo_lote:         codigoLoteConversion,
                        orden_produccion_id: orden_id,
                        bitacora_id,
                        correlativo:         correlativoConversion,
                        fecha_produccion:    new Date().toISOString().split('T')[0]
                    }, usuario);
                    existingLote = { id: newLoteId };
                }

                await this.repository.saveConsumoRollo({
                    bitacora_id,
                    maquina_id,
                    orden_id,
                    codigo_rollo: rollo.codigo_rollo,
                    sacos_producidos: rollo.sacos_producidos,
                    lote_id: existingLote.id,
                    registro_trabajo_id: registroId,
                    usuario_modificacion: usuario
                });
            }

            // e. Guardar muestras de calidad
            const especificaciones = JSON.parse(orden.especificaciones || '{}');
            for (const m of muestras) {
                let resultado = 'Cumple';
                let valorNominal = null;

                if (['ancho_saco', 'largo_saco', 'doble_costura'].includes(m.parametro)) {
                    valorNominal = especificaciones[m.parametro];
                    const tolerancia = (m.parametro === 'doble_costura') ? 0.125 : 0.25;
                    if (valorNominal !== null && valorNominal !== undefined) {
                        if (Math.abs(m.valor - valorNominal) > tolerancia) {
                            resultado = 'No cumple';
                        }
                    }
                } else if (m.parametro === 'puntadas_costura') {
                    valorNominal = 13;
                    if (m.valor < 12 || m.valor > 14) {
                        resultado = 'No cumple';
                    }
                }

                await this.repository.saveMuestraCalidad({
                    bitacora_id,
                    maquina_id,
                    orden_id,
                    inspeccion_indice: m.inspeccion_indice,
                    parametro: m.parametro,
                    valor: m.valor,
                    valor_nominal: valorNominal,
                    resultado,
                    usuario_modificacion: usuario
                });
            }

            // f. Guardar muestra física
            if (muestra_fisica) {
                await this.repository.saveMuestraFisica({
                    bitacora_id,
                    maquina_id,
                    orden_id,
                    ancho_muestra: muestra_fisica.ancho_muestra,
                    largo_muestra: muestra_fisica.largo_muestra,
                    peso_muestra_gramos: muestra_fisica.peso_muestra_gramos,
                    observaciones: muestra_fisica.observaciones,
                    usuario_modificacion: usuario
                });
            }

            // g. Guardar defectos
            for (const d of defectos) {
                await this.repository.saveDefecto({
                    bitacora_id,
                    maquina_id,
                    orden_id,
                    origen_id: d.origen_id,
                    descripcion_defecto: d.descripcion_defecto,
                    cantidad_sacos_afectados: d.cantidad_sacos_afectados,
                    usuario_modificacion: usuario
                });
            }

            // h. Calcular y guardar estado
            let estado = 'Sin datos';
            const muestrasGuardadas = await this.repository.getMuestrasCalidadByBitacoraYMaquina(bitacora_id, maquina_id);
            const tieneRollos = rollos.length > 0;
            const tieneMuestras = muestrasGuardadas.length > 0;

            if (tieneRollos || tieneMuestras || defectos.length > 0 || desperdicio_kg > 0) {
                estado = 'Parcial';

                const indicesIndices = [...new Set(muestrasGuardadas.map(m => m.inspeccion_indice))];
                const tiene4Inspecciones = [1, 2, 3, 4].every(i => indicesIndices.includes(i));

                let parametrosOk = true;
                if (tiene4Inspecciones) {
                    for (let i = 1; i <= 4; i++) {
                        const paramsInspec = muestrasGuardadas.filter(m => m.inspeccion_indice === i).map(m => m.parametro);
                        const requiredParams = ['ancho_saco', 'largo_saco', 'doble_costura', 'puntadas_costura'];
                        if (!requiredParams.every(p => paramsInspec.includes(p))) {
                            parametrosOk = false;
                            break;
                        }
                    }
                } else {
                    parametrosOk = false;
                }

                if (tieneRollos && tiene4Inspecciones && parametrosOk) {
                    estado = 'Completo';
                }

                if (muestrasGuardadas.some(m => m.resultado === 'No cumple')) {
                    estado = 'Con desviación';
                }
            }

            await this.actualizarEstado(bitacora_id, maquina_id, estado, observaciones);

            return { registro_id: registroId, estado };
        });
    }
}

module.exports = ConversionService;
