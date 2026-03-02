const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

class ConversionService {
    constructor(conversionRepository, lineaEjecucionRepository,
                registroTrabajoRepository, loteService) {
        this.conversionRepository = conversionRepository;
        this.lineaEjecucionRepository = lineaEjecucionRepository;
        this.registroTrabajoRepository = registroTrabajoRepository;
        this.loteService = loteService;
    }

    // ─────────────────────────────────────────────────────────────────────
    // getResumen: estado de todas las máquinas de Conversión en el turno
    // ─────────────────────────────────────────────────────────────────────
    async getResumen(bitacoraId) {
        const maquinas = await this.conversionRepository.getMaquinasByProceso();
        const estados = await this.conversionRepository.getEstadosMaquinasByBitacora(bitacoraId);

        return await Promise.all(maquinas.map(async (m) => {
            const estadoData = estados.find(e => e.maquina_id === m.id);
            const rollos = await this.conversionRepository.getConsumoRollosByBitacoraYMaquina(bitacoraId, m.id);
            const sacosTotal = rollos.reduce((acc, r) => acc + (r.sacos_producidos || 0), 0);

            const muestras = await this.conversionRepository.getMuestrasCalidadByBitacoraYMaquina(bitacoraId, m.id);
            const tieneDesviacion = muestras.some(mu => mu.resultado === 'No cumple');

            return {
                maquina: { id: m.id, nombre_visible: m.nombre_visible },
                estado_proceso: estadoData ? estadoData.estado : 'Sin datos',
                sacos_total: sacosTotal,
                tiene_desviacion: tieneDesviacion
            };
        }));
    }

    // ─────────────────────────────────────────────────────────────────────
    // getDetalle: datos específicos de una máquina en el turno
    // ─────────────────────────────────────────────────────────────────────
    async getDetalle(bitacoraId, maquinaId) {
        const maquina = await this.conversionRepository.getMaquinaById(maquinaId);
        const estadoMaquina = await this.conversionRepository.getEstadoMaquina(bitacoraId, maquinaId);
        const ultimoRegistro = await this.conversionRepository.getUltimoRegistro(bitacoraId, maquinaId);
        const rollos = await this.conversionRepository.getConsumoRollosByBitacoraYMaquina(bitacoraId, maquinaId);
        const muestrasCalidad = await this.conversionRepository.getMuestrasCalidadByBitacoraYMaquina(bitacoraId, maquinaId);

        let mFisica = null;
        if (ultimoRegistro && ultimoRegistro.orden_id) {
            mFisica = await this.conversionRepository.getMuestraFisicaByOrdenYBitacora(ultimoRegistro.orden_id, bitacoraId);
        }

        const defectos = await this.conversionRepository.getDefectosByBitacoraYMaquina(bitacoraId, maquinaId);

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

    // ─────────────────────────────────────────────────────────────────────
    // saveDetalle: guarda el registro del turno de conversión
    // ─────────────────────────────────────────────────────────────────────
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

        const procesoId = 5;

        // ── Validaciones ──────────────────────────────────────────────────

        // 1. Validar orden
        const codigoOrden = await this.conversionRepository.findOrdenCodigo(orden_id);
        if (!codigoOrden) throw new ValidationError(`La orden ID ${orden_id} no existe.`);
        if (!codigoOrden.startsWith('5')) {
            throw new ValidationError(`La orden ${codigoOrden} no pertenece al proceso de Conversión.`);
        }
        const orden = await this.conversionRepository.getOrdenById(orden_id);
        if (orden && orden.estado === 'Cancelada') {
            throw new ValidationError(`La orden ${codigoOrden} está cancelada.`);
        }

        // 2. Validar máquina
        const maquina = await this.conversionRepository.getMaquinaById(maquina_id);

        // 3. REGLA DURA DE ASIGNACIÓN (CONV#03)
        if (maquina.nombre_visible === 'CONV#03') {
            const especificaciones = JSON.parse(orden.especificaciones || '{}');
            if (especificaciones.con_fuelle === true || especificaciones.microperforado === true) {
                throw new ValidationError('CONV#03 no está disponible para sacos con fuelle o microperforados.');
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
        return await this.conversionRepository.withTransaction(async () => {
            // Limpiar registros previos (Idempotencia)
            await this.conversionRepository.deleteConsumoRollosByBitacoraYMaquina(bitacora_id, maquina_id);
            await this.conversionRepository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina_id);
            await this.conversionRepository.deleteMuestrasCalidadByBitacoraYMaquina(bitacora_id, maquina_id);
            await this.conversionRepository.deleteMuestraFisicaByBitacoraYMaquina(bitacora_id, maquina_id);
            await this.conversionRepository.deleteDefectosByBitacoraYMaquina(bitacora_id, maquina_id);

            // a. Obtener/crear linea_ejecucion
            let linea = await this.lineaEjecucionRepository.findByOrdenAndProceso(
                orden_id, procesoId, maquina_id
            );
            if (!linea) {
                const lineaId = await this.lineaEjecucionRepository.create(
                    orden_id, procesoId, maquina_id
                );
                linea = { id: lineaId };
            }

            // b. Guardar registro de trabajo
            const parametrosJSON = {
                sacos_total,
                destino_desperdicio,
                observaciones
            };

            const registroId = await this.registroTrabajoRepository.create({
                cantidad_producida: sacosTotal,
                merma_kg: desperdicio_kg,
                observaciones,
                parametros: JSON.stringify(parametrosJSON),
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id,
                usuario_modificacion: usuario
            });

            // d. Para cada rollo: generar/reusar lote
            let correlativoConversion = await this.conversionRepository.getMaxCorrelativoConversionPorOrden(orden_id);
            for (const rollo of rollos) {
                let existingLote = await this.conversionRepository.findLoteExistentePorRollo(orden_id, rollo.codigo_rollo);

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

                await this.conversionRepository.saveConsumoRollo({
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

                await this.conversionRepository.saveMuestraCalidad({
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
                await this.conversionRepository.saveMuestraFisica({
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
                await this.conversionRepository.saveDefecto({
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
            const muestrasGuardadas = await this.conversionRepository.getMuestrasCalidadByBitacoraYMaquina(bitacora_id, maquina_id);
            const tieneRollos = rollos.length > 0;
            const tieneMuestras = muestrasGuardadas.length > 0;

            if (tieneRollos || tieneMuestras || defectos.length > 0 || desperdicio_kg > 0) {
                estado = 'Parcial';

                // Completo: al menos 1 rollo + 4 inspecciones (1,2,3,4)
                const indicesIndices = [...new Set(muestrasGuardadas.map(m => m.inspeccion_indice))];
                const tiene4Inspecciones = [1, 2, 3, 4].every(i => indicesIndices.includes(i));

                // Verificar que cada inspección tenga los 4 parámetros
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

            await this.conversionRepository.saveEstadoMaquina(bitacora_id, maquina_id, estado, observaciones);

            return { registro_id: registroId, estado };
        });
    }
}

module.exports = ConversionService;
