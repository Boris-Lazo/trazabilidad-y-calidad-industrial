const BaseProcesoService = require('../base/BaseProcesoService');
const ValidationError = require('../../../../shared/errors/ValidationError');
const NotFoundError = require('../../../../shared/errors/NotFoundError');

class VestidosService extends BaseProcesoService {
    constructor(vestidosRepository, lineaEjecucionRepository,
                registroTrabajoRepository, loteService, auditService) {
        // Base constructor: (repository, loteService, lineaEjecucionRepository, auditService, config)
        super(vestidosRepository, loteService, lineaEjecucionRepository, auditService, {
            procesoId: 9,
            digitoOrden: '9'
        });
    }

    async getDetalle(bitacoraId) {
        const baseDetalle = await super.getDetalle(bitacoraId);
        const maquinaId = baseDetalle.maquina.id;

        const rollosSaco = await this.repository.getConsumoRollosSacoByBitacora(bitacoraId, maquinaId);
        const rollosPE = await this.repository.getConsumoRollosPEByBitacora(bitacoraId, maquinaId);
        const muestrasCalidad = await this.repository.getMuestrasCalidadByBitacora(bitacoraId, maquinaId);

        let mFisica = null;
        if (baseDetalle.ultimo_registro && baseDetalle.ultimo_registro.orden_id) {
            mFisica = await this.repository.getMuestraFisicaByOrdenYBitacora(baseDetalle.ultimo_registro.orden_id, bitacoraId);
        }

        const defectos = await this.repository.getDefectosByBitacora(bitacoraId, maquinaId);

        let params = {};
        if (baseDetalle.ultimo_registro && baseDetalle.ultimo_registro.parametros) {
            try {
                params = JSON.parse(baseDetalle.ultimo_registro.parametros);
            } catch (e) {
                params = {};
            }
        }

        return {
            ...baseDetalle,
            rollos_saco: rollosSaco,
            rollos_pe: rollosPE,
            muestras_calidad: muestrasCalidad,
            muestra_fisica: mFisica,
            defectos,
            desperdicio_tela_kg: params.desperdicio_tela_kg || 0,
            destino_desperdicio_tela: params.destino_desperdicio_tela || null,
            retorno_liner_kg: params.retorno_liner_kg || 0
        };
    }

    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            orden_id,
            rollos_saco = [],
            rollos_pe = [],
            muestras = [],
            muestra_fisica = null,
            defectos = [],
            desperdicio_tela_kg = 0,
            destino_desperdicio_tela = null,
            retorno_liner_kg = 0,
            observaciones = ''
        } = data;

        const procesoId = this.config.procesoId;

        // ── Validaciones ──────────────────────────────────────────────────
        await this.validarOrden(orden_id);
        const orden = await this.repository.getOrdenById(orden_id);

        const maquina = await this.repository.getMaquina();
        const maquinaId = maquina.id;

        // 3. REGLA DURA DE ASIGNACIÓN
        const specs = JSON.parse(orden.especificaciones || '{}');
        if (specs.con_fuelle === true || specs.microperforado === true) {
            throw new ValidationError(`La máquina ${maquina.nombre_visible} no puede procesar sacos con fuelle o microperforados.`);
        }

        // 4. Validar rollos de saco
        for (const r of rollos_saco) {
            if (!r.codigo_rollo || r.codigo_rollo.trim() === '') {
                throw new ValidationError('El código de rollo de saco no puede estar vacío.');
            }
            if (!r.sacos_producidos || r.sacos_producidos <= 0) {
                throw new ValidationError(`El rollo ${r.codigo_rollo} debe tener sacos producidos > 0.`);
            }
        }

        // 5. Validar rollos PE
        for (const r of rollos_pe) {
            if (!r.lote_pe_id) {
                throw new ValidationError('El ID de lote PE es obligatorio para los rollos PE.');
            }
            const lotePE = await this.loteService.getById(r.lote_pe_id);
            if (!lotePE) throw new ValidationError('El lote PE indicado no existe in the system.');
            if (lotePE.estado === 'cerrado') {
                throw new ValidationError(`El lote PE ${lotePE.codigo_lote} está cerrado.`);
            }
        }

        // 6. Producción total y consistencia
        const sacos_total = rollos_saco.reduce((acc, r) => acc + (r.sacos_producidos || 0), 0);
        if (sacos_total > 0) {
            if (rollos_saco.length === 0) {
                throw new ValidationError('Debe declarar al menos un rollo de saco cuando hay producción.');
            }
            if (rollos_pe.length === 0) {
                throw new ValidationError('Al menos un rollo PE debe declararse por turno con producción > 0.');
            }
        }

        // 7. Validar sello_liner y otros parámetros de muestras
        for (const m of muestras) {
            if (m.parametro === 'sello_liner') {
                if (!['Cumple', 'No cumple'].includes(m.resultado)) {
                    throw new ValidationError(`Resultado de sello_liner inválido: ${m.resultado}. Debe ser 'Cumple' o 'No cumple'.`);
                }
            }
        }

        // 8. Validar defectos
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
            await this.repository.deleteConsumoRollosSacoByBitacora(bitacora_id, maquinaId);
            await this.repository.deleteConsumoRollosPEByBitacora(bitacora_id, maquinaId);
            await this.repository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquinaId);
            await this.repository.deleteMuestrasCalidadByBitacora(bitacora_id, maquinaId);
            await this.repository.deleteMuestraFisicaByBitacora(bitacora_id, maquinaId);
            await this.repository.deleteDefectosByBitacora(bitacora_id, maquinaId);

            // a. Obtener/crear linea_ejecucion
            const linea = await this.obtenerOCrearLineaEjecucion(orden_id, maquinaId);

            // b. Guardar registro de trabajo
            const parametrosJSON = {
                sacos_total,
                desperdicio_tela_kg,
                destino_desperdicio_tela,
                retorno_liner_kg,
                observaciones
            };

            const registroId = await this.repository.saveRegistroTrabajo({
                cantidad_producida: sacos_total,
                merma_kg: desperdicio_tela_kg,
                observaciones,
                parametros: parametrosJSON,
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id: maquinaId,
                usuario_modificacion: usuario
            });

            // c. Rollos de saco — generar/reusar lote con sufijo -V
            let correlativoVestidos = await this.repository.getMaxCorrelativoVestidosPorOrden(orden_id);
            for (const rollo of rollos_saco) {
                let existingLote = await this.repository.findLoteExistentePorRolloSaco(orden_id, rollo.codigo_rollo);

                if (!existingLote) {
                    correlativoVestidos++;
                    const codigoLoteVestidos = `${rollo.codigo_rollo}-V${String(correlativoVestidos).padStart(3, '0')}`;

                    const newLoteId = await this.loteService.crearLoteDirecto({
                        codigo_lote:         codigoLoteVestidos,
                        orden_produccion_id: orden_id,
                        bitacora_id,
                        correlativo:         correlativoVestidos,
                        fecha_produccion:    new Date().toISOString().split('T')[0]
                    }, usuario);
                    existingLote = { id: newLoteId };
                }

                let origenProcesoId = 2; // Telares
                if (rollo.codigo_rollo.includes('-I')) {
                    origenProcesoId = 4; // Imprenta
                } else if (rollo.codigo_rollo.includes('-L')) {
                    origenProcesoId = 3; // Laminado
                }

                await this.repository.saveConsumoRolloSaco({
                    bitacora_id,
                    maquina_id: maquinaId,
                    orden_id,
                    codigo_rollo: rollo.codigo_rollo,
                    origen_proceso_id: origenProcesoId,
                    sacos_producidos: rollo.sacos_producidos,
                    lote_id: existingLote.id,
                    registro_trabajo_id: registroId,
                    usuario_modificacion: usuario
                });
            }

            // d. Rollos PE — declarar consumo referencial
            for (const r of rollos_pe) {
                const lotePE = await this.loteService.getById(r.lote_pe_id);
                await this.repository.saveConsumoRolloPE({
                    bitacora_id,
                    maquina_id: maquinaId,
                    orden_id,
                    codigo_lote_pe: lotePE.codigo_lote,
                    lote_pe_id: r.lote_pe_id,
                    registro_trabajo_id: registroId,
                    usuario_modificacion: usuario
                });
            }

            // e. Calcular resultados de muestras en el service
            for (const m of muestras) {
                let resultado = 'Cumple';
                let valorNominal = null;

                if (['ancho_saco', 'largo_saco', 'doble_costura'].includes(m.parametro)) {
                    valorNominal = specs[m.parametro];
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
                } else if (m.parametro === 'sello_liner') {
                    resultado = m.resultado;
                }

                await this.repository.saveMuestraCalidad({
                    bitacora_id,
                    maquina_id: maquinaId,
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
                    maquina_id: maquinaId,
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
                    maquina_id: maquinaId,
                    orden_id,
                    origen_id: d.origen_id,
                    descripcion_defecto: d.descripcion_defecto,
                    cantidad_sacos_afectados: d.cantidad_sacos_afectados,
                    usuario_modificacion: usuario
                });
            }

            // h. Calcular y guardar estado
            let estado = 'Sin datos';
            const muestrasGuardadas = await this.repository.getMuestrasCalidadByBitacora(bitacora_id, maquinaId);
            const tieneProduccion = rollos_saco.length > 0;
            const tieneRollosPE = rollos_pe.length > 0;
            const tieneMuestras = muestrasGuardadas.length > 0;

            if (tieneProduccion || tieneMuestras || defectos.length > 0 || desperdicio_tela_kg > 0 || retorno_liner_kg > 0) {
                estado = 'Parcial';

                const indicesIndices = [...new Set(muestrasGuardadas.map(m => m.inspeccion_indice))];
                const tiene4Inspecciones = [1, 2, 3, 4].every(i => indicesIndices.includes(i));

                let parametrosOk = true;
                if (tiene4Inspecciones) {
                    for (let i = 1; i <= 4; i++) {
                        const paramsInspec = muestrasGuardadas.filter(m => m.inspeccion_indice === i).map(m => m.parametro);
                        const requiredParams = ['ancho_saco', 'largo_saco', 'doble_costura', 'puntadas_costura', 'sello_liner'];
                        if (!requiredParams.every(p => paramsInspec.includes(p))) {
                            parametrosOk = false;
                            break;
                        }
                    }
                } else {
                    parametrosOk = false;
                }

                if (tieneProduccion && tieneRollosPE && tiene4Inspecciones && parametrosOk) {
                    estado = 'Completo';
                }

                if (muestrasGuardadas.some(m => m.resultado === 'No cumple')) {
                    estado = 'Con desviación';
                }
            }

            await this.actualizarEstado(bitacora_id, maquinaId, estado, observaciones);

            return { registro_id: registroId, estado };
        });
    }
}

module.exports = VestidosService;
