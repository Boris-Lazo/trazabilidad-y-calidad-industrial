const BaseProcesoService = require('../base/BaseProcesoService');
const ValidationError = require('../../../../shared/errors/ValidationError');

class LinerPEService extends BaseProcesoService {
    constructor(linerPERepository, lineaEjecucionRepository,
                registroTrabajoRepository, loteService, auditService) {
        // Base constructor: (repository, loteService, lineaEjecucionRepository, auditService, config)
        super(linerPERepository, loteService, lineaEjecucionRepository, auditService, {
            procesoId: 7,
            digitoOrden: '7'
        });
    }

    async getDetalle(bitacoraId) {
        const baseDetalle = await super.getDetalle(bitacoraId);
        const maquinaId = baseDetalle.maquina.id;

        const rollos = await this.repository.getConsumoRollosPEByBitacora(bitacoraId, maquinaId);
        const muestrasCalidad = await this.repository.getMuestrasCalidadByBitacora(bitacoraId, maquinaId);

        return {
            ...baseDetalle,
            rollos_pe_consumidos: rollos,
            muestras_calidad: muestrasCalidad,
            lote_turno: baseDetalle.lote
        };
    }

    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            orden_id,
            liners_producidos = 0,
            rollos_pe = [],
            muestras = [],
            temperatura_sellado,
            velocidad_operacion,
            merma_kg = 0,
            observaciones = ''
        } = data;

        const procesoId = this.config.procesoId;

        // 1. Validar orden
        await this.validarOrden(orden_id);
        const orden = await this.repository.getOrdenById(orden_id);

        // 2. Validar Rollos PE
        for (const rollo of rollos_pe) {
            const lote = await this.loteService.getById(rollo.lote_pe_id);
            if (!lote) throw new ValidationError('El lote PE indicado no existe.');
            if (lote.estado === 'cerrado') {
                throw new ValidationError(`El lote ${lote.codigo_lote} está cerrado.`);
            }
        }

        // 3. Validar producción
        if (liners_producidos > 0) {
            if (rollos_pe.length === 0) {
                throw new ValidationError('Debe declarar al menos un rollo PE cuando hay producción.');
            }
            if (temperatura_sellado === undefined || temperatura_sellado === null || temperatura_sellado <= 0) {
                throw new ValidationError('La temperatura de sellado es obligatoria y debe ser mayor a 0 cuando hay producción.');
            }
            if (velocidad_operacion === undefined || velocidad_operacion === null || velocidad_operacion <= 0) {
                throw new ValidationError('La velocidad de operación es obligatoria y debe ser mayor a 0 cuando hay producción.');
            }
        }

        // 4. Validar sello_fondo
        for (const m of muestras) {
            if (m.parametro === 'sello_fondo') {
                if (!['Cumple', 'No cumple'].includes(m.resultado)) {
                    throw new ValidationError('El resultado de sello_fondo debe ser "Cumple" o "No cumple".');
                }
            }
        }

        const maquina = await this.repository.getMaquina();

        return await this.repository.withTransaction(async () => {
            // Idempotencia: borrar previos
            await this.repository.deleteConsumoRollosPEByBitacora(bitacora_id, maquina.id);
            await this.repository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteMuestrasCalidadByBitacora(bitacora_id, maquina.id);

            // a. Obtener/crear linea_ejecucion
            const linea = await this.obtenerOCrearLineaEjecucion(orden_id, maquina.id);

            // b. Guardar registro_trabajo
            const parametrosJSON = {
                liners_producidos,
                temperatura_sellado,
                velocidad_operacion,
                merma_kg,
                destino_merma: 'Retorno ExtrusorPE',
                observaciones
            };

            const registroId = await this.repository.saveRegistroTrabajo({
                cantidad_producida: liners_producidos,
                merma_kg,
                observaciones,
                parametros: parametrosJSON,
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id: maquina.id,
                usuario_modificacion: usuario
            });

            // c. Guardar rollos PE
            for (const rollo of rollos_pe) {
                const lote = await this.loteService.getById(rollo.lote_pe_id);
                await this.repository.saveConsumoRolloPE({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    codigo_lote_pe: lote.codigo_lote,
                    lote_pe_id: rollo.lote_pe_id,
                    registro_trabajo_id: registroId,
                    usuario_modificacion: usuario
                });
            }

            // d. Lote del turno
            let loteTurno = await this.loteService.getByBitacoraYOrden(bitacora_id, orden_id);
            if (!loteTurno) {
                const count = await this.repository.getMaxCorrelativoLinerPEPorOrden(orden_id);
                const correlativo = count + 1;
                const codigo_lote = `${orden.codigo_orden}-${String(correlativo).padStart(3, '0')}`;
                await this.loteService.crearLoteDirecto({
                    codigo_lote,
                    orden_produccion_id: orden_id,
                    bitacora_id,
                    correlativo,
                    fecha_produccion: new Date().toISOString().split('T')[0]
                }, usuario);
            }

            // e. Guardar muestras
            const especificaciones = JSON.parse(orden.especificaciones || '{}');
            for (const m of muestras) {
                let resultado = m.resultado;
                let valorNominal = null;

                if (['ancho_liner', 'largo_liner'].includes(m.parametro)) {
                    valorNominal = especificaciones[m.parametro === 'ancho_liner' ? 'ancho_nominal' : 'largo_nominal'];
                    if (valorNominal !== undefined && valorNominal !== null) {
                        if (Math.abs(m.valor - valorNominal) > 0.25) {
                            resultado = 'No cumple';
                        } else {
                            resultado = 'Cumple';
                        }
                    }
                }

                await this.repository.saveMuestraCalidad({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    inspeccion_indice: m.inspeccion_indice,
                    parametro: m.parametro,
                    valor: m.valor,
                    valor_nominal: valorNominal,
                    resultado,
                    usuario_modificacion: usuario
                });
            }

            // f. Calcular estado
            let estado = 'Sin datos';
            const muestrasGuardadas = await this.repository.getMuestrasCalidadByBitacora(bitacora_id, maquina.id);

            const tieneProduccion = liners_producidos > 0;
            const tieneMuestras = muestrasGuardadas.length > 0;

            if (tieneProduccion || tieneMuestras || merma_kg > 0) {
                estado = 'Parcial';

                if (tieneProduccion && rollos_pe.length > 0 && temperatura_sellado > 0 && velocidad_operacion > 0) {
                    const indices = [...new Set(muestrasGuardadas.map(m => m.inspeccion_indice))];
                    const tiene4Inspecciones = [1, 2, 3, 4].every(i => indices.includes(i));

                    let paramsOk = true;
                    if (tiene4Inspecciones) {
                        for (let i = 1; i <= 4; i++) {
                            const paramsInspec = muestrasGuardadas.filter(m => m.inspeccion_indice === i).map(m => m.parametro);
                            if (!['ancho_liner', 'largo_liner', 'sello_fondo'].every(p => paramsInspec.includes(p))) {
                                paramsOk = false;
                                break;
                            }
                        }
                    } else {
                        paramsOk = false;
                    }

                    if (paramsOk) {
                        estado = 'Completo';
                    }
                }

                if (muestrasGuardadas.some(m => m.resultado === 'No cumple')) {
                    estado = 'Con desviación';
                }
            }

            await this.actualizarEstado(bitacora_id, maquina.id, estado, observaciones);

            return { registro_id: registroId, estado };
        });
    }
}

module.exports = LinerPEService;
