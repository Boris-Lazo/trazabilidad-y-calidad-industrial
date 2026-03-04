const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');
const { logger } = require('../../shared/logger/logger');

class LaminadoService {
    constructor(laminadoRepository, lineaEjecucionRepository,
                registroTrabajoRepository, muestraRepository, loteService) {
        this.laminadoRepository = laminadoRepository;
        this.lineaEjecucionRepository = lineaEjecucionRepository;
        this.registroTrabajoRepository = registroTrabajoRepository;
        this.muestraRepository = muestraRepository;
        this.loteService = loteService;
    }

    // ─────────────────────────────────────────────────────────────────────
    // getDetalle: estado actual de la laminadora en una bitácora
    // ─────────────────────────────────────────────────────────────────────
    async getDetalle(bitacoraId) {
        const maquina = await this.laminadoRepository.getMaquina();
        const estadoMaquina = await this.laminadoRepository.getEstadoMaquina(bitacoraId, maquina.id);
        const ultimoRegistro = await this.laminadoRepository.getUltimoRegistro(bitacoraId, maquina.id);
        const muestras = await this.laminadoRepository.getMuestrasByBitacora(bitacoraId, maquina.id);
        const rollosConsumidos = await this.laminadoRepository.getConsumoRollosByBitacora(bitacoraId, maquina.id);
        const materiasPrimas = await this.laminadoRepository.getMateriasPrimasByBitacora(bitacoraId, maquina.id);

        // Enriquecer materias primas: indicar si tienen PDF disponible en el almacén central
        const materiasPrimasEnriquecidas = await Promise.all(
            materiasPrimas.map(async (mp) => {
                const pdfCentral = await this.laminadoRepository.getPdfMaterial(
                    mp.tipo, mp.marca, mp.lote_material
                );
                return {
                    ...mp,
                    tiene_pdf: !!(pdfCentral || mp.pdf_nombre_archivo),
                    advertencia_pdf: !(pdfCentral || mp.pdf_nombre_archivo)
                        ? 'Hoja técnica no subida para este material.' : null
                };
            })
        );

        return {
            maquina,
            estado_proceso: estadoMaquina ? estadoMaquina.estado : 'Sin datos',
            ultimo_registro: ultimoRegistro,
            muestras,
            rollos_consumidos: rollosConsumidos,
            materias_primas: materiasPrimasEnriquecidas
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // saveDetalle: guarda el registro del turno de laminado
    // ─────────────────────────────────────────────────────────────────────
    async saveDetalle(data, usuario) {
        const {
            bitacora_id,
            orden_id,
            rollos = [],
            muestras = [],
            parametros_operativos = {},
            materias_primas = [],
            pelicula_impresa = null,
            desperdicio_kg = 0,
            observaciones = ''
        } = data;

        const procesoId = 3;

        // ── Validaciones ──────────────────────────────────────────────────

        // 1. Validar orden
        const codigoOrden = await this.laminadoRepository.findOrdenCodigo(orden_id);
        if (!codigoOrden) throw new ValidationError(`La orden ID ${orden_id} no existe.`);
        if (!codigoOrden.startsWith('3')) {
            throw new ValidationError(`La orden ${codigoOrden} no pertenece al proceso de Laminado.`);
        }
        const orden = await this.laminadoRepository.getOrdenById(orden_id);
        if (orden && orden.estado === 'Cancelada') {
            throw new ValidationError(`La orden ${codigoOrden} está cancelada.`);
        }

        // 2. Validar rollos: al menos 1 si hay producción
        const metrosTotales = rollos.reduce((acc, r) => acc + (r.metros_laminados || 0), 0);
        if (metrosTotales > 0 && rollos.length === 0) {
            throw new ValidationError('Debe declarar al menos un rollo consumido cuando hay producción.');
        }
        for (const r of rollos) {
            if (!r.codigo_rollo || r.codigo_rollo.trim() === '') {
                throw new ValidationError('El código de rollo no puede estar vacío.');
            }
            if (!r.metros_laminados || r.metros_laminados <= 0) {
                throw new ValidationError(`El rollo ${r.codigo_rollo} debe tener metros laminados > 0.`);
            }
        }

        // 3. Validar materias primas: suma debe ser 100%
        if (materias_primas.length > 0) {
            const suma = materias_primas.reduce((acc, mp) => acc + (mp.porcentaje || 0), 0);
            if (Math.abs(suma - 100) > 0.01) {
                throw new ValidationError('La suma de porcentajes de materias primas debe ser 100%.');
            }
        }

        // 4. Validar muestras mínimas: al menos 1 por cada rollo laminado
        if (rollos.length > 0) {
            if (muestras.length < rollos.length) {
                 throw new ValidationError(`Se requieren al menos ${rollos.length} muestras de calidad (una por cada rollo laminado).`);
            }
        }

        // 5. Validar adherencia: debe ser 'Pasa' o 'No pasa'
        for (const m of muestras) {
            if (m.parametro === 'adherencia' && !['Pasa', 'No pasa'].includes(m.resultado)) {
                throw new ValidationError('El resultado de adherencia debe ser "Pasa" o "No pasa".');
            }
        }

        // ── Transacción ───────────────────────────────────────────────────
        return await this.laminadoRepository.withTransaction(async () => {
            const maquina = await this.laminadoRepository.getMaquina();

            // Limpiar registros previos del turno (idempotente)
            // IMPORTANTE: Primero borrar dependencias de registros_trabajo por las FK
            await this.laminadoRepository.deleteConsumoRollosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.laminadoRepository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.laminadoRepository.deleteMuestrasByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.laminadoRepository.deleteMateriasPrimasByBitacoraYMaquina(bitacora_id, maquina.id);

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

            // b. Guardar registro de trabajo (producción total del turno)
            const parametrosJSON = {
                metros_totales: metrosTotales,
                ...parametros_operativos,
                ...(pelicula_impresa ? { pelicula_impresa } : {})
            };

            const registroId = await this.registroTrabajoRepository.create({
                cantidad_producida: metrosTotales,
                merma_kg: desperdicio_kg,
                observaciones,
                parametros: JSON.stringify(parametrosJSON),
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id: maquina.id,
                usuario_modificacion: usuario
            });

            // c. Guardar rollos consumidos + generar lote por rollo (IDEMPOTENTE)
            let correlativoLaminado = await this.laminadoRepository.getMaxCorrelativoLaminadoPorOrden(orden_id);

            for (const rollo of rollos) {
                // Guardar consumo de rollo
                await this.laminadoRepository.saveConsumoRollo({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    codigo_rollo: rollo.codigo_rollo,
                    metros_laminados: rollo.metros_laminados,
                    registro_trabajo_id: registroId,
                    usuario_modificacion: usuario
                });

                // Generar lote Laminado: {codigo_rollo}-L{correlativo}
                // Verificamos si ya existe un lote para esta bitácora y este rollo para evitar duplicados
                // pero como borramos registros_trabajo pero NO lotes (porque los lotes son transversales),
                // buscamos si el lote ya existe.

                // Opción robusta: buscar por codigo_lote que sigue el patrón
                // Pero como el correlativo es incremental por orden, es mejor ver si ya existe algo para esta bitacora+orden
                // Sin embargo, Laminado genera MULTIPLES lotes por bitácora (uno por rollo).

                // Buscamos si ya existe el lote con el patrón {rollo.codigo_rollo}-L...
                const existingLote = await this.laminadoRepository
                    .findLoteExistentePorRollo(orden_id, rollo.codigo_rollo);

                if (!existingLote) {
                    correlativoLaminado++;
                    const codigoLoteLaminado = `${rollo.codigo_rollo}-L${String(correlativoLaminado).padStart(3, '0')}`;

                    await this.loteService.crearLoteDirecto({
                        codigo_lote:         codigoLoteLaminado,
                        orden_produccion_id: orden_id,
                        bitacora_id,
                        correlativo:         correlativoLaminado,
                        fecha_produccion:    new Date().toISOString().split('T')[0]
                    }, usuario);
                }
            }

            // d. Guardar muestras de calidad
            for (const m of muestras) {
                await this.muestraRepository.create({
                    parametro: m.parametro,
                    valor: m.valor,
                    resultado: m.resultado,
                    valor_nominal: m.valor_nominal,
                    bitacora_id,
                    proceso_id: procesoId,
                    maquina_id: maquina.id,
                    usuario_modificacion: usuario
                });
            }

            // e. Guardar materias primas y gestionar PDF central
            for (const mp of materias_primas) {
                let finalPdfNombre = mp.pdf_nombre;
                let finalPdfBlob = mp.pdf_base64;

                // Si no viene PDF en el payload, intentar recuperar del almacén central
                if (!finalPdfBlob) {
                    const pdfCentral = await this.laminadoRepository.getPdfMaterial(
                        mp.tipo, mp.marca, mp.lote_material
                    );
                    if (pdfCentral) {
                        finalPdfBlob = pdfCentral.pdf_hoja_tecnica;
                        finalPdfNombre = pdfCentral.pdf_nombre_archivo;
                    }
                } else {
                    // Si viene un PDF nuevo, actualizar almacén central
                    await this.laminadoRepository.upsertPdfMaterial(
                        mp.tipo, mp.marca, mp.lote_material,
                        finalPdfBlob, finalPdfNombre, usuario
                    );
                }

                await this.laminadoRepository.saveMateriasPrimas({
                    bitacora_id,
                    maquina_id: maquina.id,
                    tipo: mp.tipo,
                    marca: mp.marca,
                    lote_material: mp.lote_material,
                    porcentaje: mp.porcentaje,
                    pdf_hoja_tecnica: finalPdfBlob,
                    pdf_nombre_archivo: finalPdfNombre,
                    usuario_modificacion: usuario
                });
            }

            // f. Calcular estado del proceso en la máquina
            let estado = 'Sin datos';
            if (metrosTotales > 0 || desperdicio_kg > 0 || muestras.length > 0) {
                estado = 'Parcial';

                // Criterio de "Completo"
                const tieneProduccion = metrosTotales > 0;
                const tieneMuestrasSuficientes = rollos.length > 0 ? muestras.length >= rollos.length : muestras.length > 0;
                const tieneMateriasPrimas = materias_primas.length > 0;
                const calidadOk = muestras.every(m => m.resultado === 'Cumple' || m.resultado === 'Pasa');

                if (tieneProduccion && tieneMuestrasSuficientes && tieneMateriasPrimas) {
                    estado = 'Completo';
                }
                if (!calidadOk) {
                    estado = 'Con desviación';
                }
            }

            await this.laminadoRepository.saveEstadoMaquina(bitacora_id, maquina.id, estado, observaciones);

            return { registro_id: registroId, estado };
        });
    }

    async uploadPdf(tipo, marca, loteMaterial, pdfBase64, pdfNombre, usuario) {
        if (!pdfBase64 || !pdfNombre) {
            throw new ValidationError('Se requiere el archivo PDF y su nombre.');
        }

        const existente = await this.laminadoRepository.getPdfMaterial(
            tipo, marca, loteMaterial
        );
        const estaSobrescribiendo = !!existente;

        const pdfBlob = Buffer.from(pdfBase64, 'base64');
        await this.laminadoRepository.upsertPdfMaterial(
            tipo, marca, loteMaterial, pdfBlob, pdfNombre, usuario
        );

        return {
            mensaje: estaSobrescribiendo
                ? `Se actualizó la hoja técnica existente para ${tipo} - ${marca} - ${loteMaterial}. El archivo anterior fue reemplazado.`
                : `Hoja técnica de ${tipo} - ${marca} - ${loteMaterial} guardada correctamente.`,
            sobrescrito: estaSobrescribiendo,
            archivo_anterior: estaSobrescribiendo
                ? existente.pdf_nombre_archivo : null
        };
    }
}

module.exports = LaminadoService;
