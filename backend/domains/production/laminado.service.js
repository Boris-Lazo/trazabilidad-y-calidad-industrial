const BaseProcesoService = require('./base/BaseProcesoService');
const ValidationError = require('../../shared/errors/ValidationError');

class LaminadoService extends BaseProcesoService {
    constructor(laminadoRepository, lineaEjecucionRepository,
                registroTrabajoRepository, muestraRepository, loteService, auditService) {
        // Base constructor: (repository, loteService, lineaEjecucionRepository, auditService, config)
        super(laminadoRepository, loteService, lineaEjecucionRepository, auditService, {
            procesoId: 3,
            digitoOrden: '3'
        });
        this.muestraRepository = muestraRepository;
    }

    async getDetalle(bitacoraId) {
        const baseDetalle = await super.getDetalle(bitacoraId);
        const maquinaId = baseDetalle.maquina.id;

        const muestras = await this.repository.getMuestrasByBitacora(bitacoraId, maquinaId);
        const rollosConsumidos = await this.repository.getConsumoRollosByBitacora(bitacoraId, maquinaId);
        const materiasPrimas = await this.repository.getMateriasPrimasByBitacora(bitacoraId, maquinaId);

        // Enriquecer materias primas: indicar si tienen PDF disponible en el almacén central
        const materiasPrimasEnriquecidas = await Promise.all(
            materiasPrimas.map(async (mp) => {
                const pdfCentral = await this.repository.getPdfMaterial(
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
            ...baseDetalle,
            muestras,
            rollos_consumidos: rollosConsumidos,
            materias_primas: materiasPrimasEnriquecidas
        };
    }

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

        const procesoId = this.config.procesoId;

        // ── Validaciones ──────────────────────────────────────────────────
        await this.validarOrden(orden_id);
        const orden = await this.repository.getOrdenById(orden_id);

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
        return await this.repository.withTransaction(async () => {
            const maquina = await this.repository.getMaquina();

            // Limpiar registros previos del turno (idempotente)
            await this.repository.deleteConsumoRollosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteRegistrosByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteMuestrasByBitacoraYMaquina(bitacora_id, maquina.id);
            await this.repository.deleteMateriasPrimasByBitacoraYMaquina(bitacora_id, maquina.id);

            // a. Obtener/crear linea_ejecucion
            const linea = await this.obtenerOCrearLineaEjecucion(orden_id, maquina.id);

            // b. Guardar registro de trabajo
            const parametrosJSON = {
                metros_totales: metrosTotales,
                ...parametros_operativos,
                ...(pelicula_impresa ? { pelicula_impresa } : {})
            };

            const registroId = await this.repository.saveRegistroTrabajo({
                cantidad_producida: metrosTotales,
                merma_kg: desperdicio_kg,
                observaciones,
                parametros: parametrosJSON,
                linea_ejecucion_id: linea.id,
                bitacora_id,
                maquina_id: maquina.id,
                usuario_modificacion: usuario
            });

            // c. Guardar rollos consumidos + generar lote por rollo
            let correlativoLaminado = await this.repository.getMaxCorrelativoLaminadoPorOrden(orden_id);

            for (const rollo of rollos) {
                await this.repository.saveConsumoRollo({
                    bitacora_id,
                    maquina_id: maquina.id,
                    orden_id,
                    codigo_rollo: rollo.codigo_rollo,
                    metros_laminados: rollo.metros_laminados,
                    registro_trabajo_id: registroId,
                    usuario_modificacion: usuario
                });

                const existingLote = await this.repository.findLoteExistentePorRollo(orden_id, rollo.codigo_rollo);

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

                if (!finalPdfBlob) {
                    const pdfCentral = await this.repository.getPdfMaterial(
                        mp.tipo, mp.marca, mp.lote_material
                    );
                    if (pdfCentral) {
                        finalPdfBlob = pdfCentral.pdf_hoja_tecnica;
                        finalPdfNombre = pdfCentral.pdf_nombre_archivo;
                    }
                } else {
                    await this.repository.upsertPdfMaterial(
                        mp.tipo, mp.marca, mp.lote_material,
                        Buffer.from(finalPdfBlob, 'base64'), finalPdfNombre, usuario
                    );
                }

                await this.repository.saveMateriasPrimas({
                    bitacora_id,
                    maquina_id: maquina.id,
                    tipo: mp.tipo,
                    marca: mp.marca,
                    lote_material: mp.lote_material,
                    porcentaje: mp.porcentaje,
                    pdf_hoja_tecnica: finalPdfBlob ? Buffer.from(finalPdfBlob, 'base64') : null,
                    pdf_nombre_archivo: finalPdfNombre,
                    usuario_modificacion: usuario
                });
            }

            // f. Calcular estado del proceso
            let estado = 'Sin datos';
            if (metrosTotales > 0 || desperdicio_kg > 0 || muestras.length > 0) {
                estado = 'Parcial';
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

            await this.actualizarEstado(bitacora_id, maquina.id, estado, observaciones);

            return { registro_id: registroId, estado };
        });
    }

    async uploadPdf(tipo, marca, loteMaterial, pdfBase64, pdfNombre, usuario) {
        if (!pdfBase64 || !pdfNombre) {
            throw new ValidationError('Se requiere el archivo PDF y su nombre.');
        }

        const existente = await this.repository.getPdfMaterial(
            tipo, marca, loteMaterial
        );
        const estaSobrescribiendo = !!existente;

        const pdfBlob = Buffer.from(pdfBase64, 'base64');
        await this.repository.upsertPdfMaterial(
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
