const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

class ImprentaService {
    constructor(imprentaRepository, lineaEjecucionRepository,
                registroTrabajoRepository, loteService) {
        this.imprentaRepository = imprentaRepository;
        this.lineaEjecucionRepository = lineaEjecucionRepository;
        this.registroTrabajoRepository = registroTrabajoRepository;
        this.loteService = loteService;
    }

    // ─────────────────────────────────────────────────────────────────────
    // getDetalle: estado actual de la imprenta en una bitácora
    // ─────────────────────────────────────────────────────────────────────
    async getDetalle(bitacoraId) {
        const maquina = await this.imprentaRepository.getMaquina();
        const estadoMaquina = await this.imprentaRepository.getEstadoMaquina(bitacoraId, maquina.id);
        const ultimoRegistro = await this.imprentaRepository.getUltimoRegistro(bitacoraId, maquina.id);
        const rollosConsumidos = await this.imprentaRepository.getConsumoRollosByBitacora(bitacoraId, maquina.id);
        const tintas = await this.imprentaRepository.getTintasByBitacora(bitacoraId, maquina.id);
        const muestrasCalidad = await this.imprentaRepository.getMuestrasCalidadByBitacora(bitacoraId, maquina.id);

        return {
            maquina,
            estado_proceso: estadoMaquina ? estadoMaquina.estado : 'Sin datos',
            ultimo_registro: ultimoRegistro,
            rollos_consumidos: rollosConsumidos,
            tintas,
            muestras_calidad: muestrasCalidad
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // saveDetalle: guarda el registro del turno de imprenta
    // ─────────────────────────────────────────────────────────────────────
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

        const procesoId = 4;

        // ── Validaciones ──────────────────────────────────────────────────

        // 1. Validar orden
        const codigoOrden = await this.imprentaRepository.findOrdenCodigo(orden_id);
        if (!codigoOrden) throw new ValidationError(`La orden ID ${orden_id} no existe.`);
        if (!codigoOrden.startsWith('4')) {
            throw new ValidationError(`La orden ${codigoOrden} no pertenece al proceso de Imprenta.`);
        }
        const orden = await this.imprentaRepository.getOrdenById(orden_id);
        if (orden && orden.estado === 'Cancelada') {
            throw new ValidationError(`La orden ${codigoOrden} está cancelada.`);
        }

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
        return await this.imprentaRepository.withTransaction(async () => {
            const maquina = await this.imprentaRepository.getMaquina();

            // Limpiar registros previos del turno (idempotente para todo excepto lotes)
            await this.imprentaRepository.deleteConsumoRollosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.imprentaRepository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.imprentaRepository.deleteTintasByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.imprentaRepository.deleteMuestrasCalidadByBitacoraYMaquina(bitacora_id, maquina.id);

            // a. Obtener/crear linea_ejecucion
            let linea = await this.lineaEjecucionRepository.findByOrdenAndProceso(
                orden_id, procesoId, maquina.id
            );
            if (!linea) {
                const lineaId = await this.lineaEjecucionRepository.create(
                    orden_id, procesoId, maquina.id
                );
                linea = { id: lineaId };
            }

            // b. Guardar registro de trabajo
            const parametrosJSON = {
                impresiones_totales: impresionesTotales,
                tipo_desperdicio,
                ...parametros_operativos
            };

            const registroId = await this.imprentaRepository.saveRegistroTrabajo({
                cantidad_producida: impresionesTotales,
                merma_kg: desperdicio_kg,
                observaciones,
                parametros: JSON.stringify(parametrosJSON),
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id: maquina.id,
                usuario_modificacion: usuario
            });

            // c. Guardar rollos + generar lote por rollo
            let correlativoImprenta = await this.imprentaRepository.getMaxCorrelativoImprentaPorOrden(orden_id);

            for (const rollo of rollos) {
                // Inferir origen_proceso_id
                const origen_proceso_id = rollo.codigo_rollo.includes('-L') ? 3 : 2;

                // Buscar lote existente para este rollo
                let existingLote = await this.imprentaRepository.findLoteExistentePorRollo(orden_id, rollo.codigo_rollo);

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

                await this.imprentaRepository.saveConsumoRollo({
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
                await this.imprentaRepository.saveTinta({
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

                await this.imprentaRepository.saveMuestraCalidad({
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

                // Criterio Completo: al menos 1 rollo + 3 inspecciones con al menos 1 muestra por tinta activa + tintas declaradas
                // Obtenemos tintas activas (las que se declararon en este guardado)
                const numTintasActivas = tintas.length;
                const inspeccionesIndices = [...new Set(muestras.map(m => m.inspeccion_indice))];
                const tiene3Inspecciones = [1, 2, 3].every(i => inspeccionesIndices.includes(i));

                // Verificar si cada inspección tiene al menos 1 muestra por cada tinta declarada
                let muestrasPorTintaOk = true;
                if (numTintasActivas > 0) {
                    for (let i = 1; i <= 3; i++) {
                        const muestrasInspec = muestras.filter(m => m.inspeccion_indice === i);
                        // Contamos tintas únicas en las muestras de esta inspección
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

                // Criterio Desviación
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

            await this.imprentaRepository.saveEstadoMaquina(bitacora_id, maquina.id, estado, observaciones);

            return { registro_id: registroId, estado };
        });
    }
}

module.exports = ImprentaService;
