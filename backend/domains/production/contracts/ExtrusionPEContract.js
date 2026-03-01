const ProcessContract = require('./ProcessContract');

class ExtrusionPEContract extends ProcessContract {
    constructor() {
        super({
            processId: 6,
            nombre: 'Extrusión de Polietileno',
            nombreCorto: 'Extrusor PE',
            unidadProduccion: 'kg',
            descripcionProducto: 'Bobinas de película tubular (manga de PE) para liner de sacos',
            patronCodigoOrden: '6\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            maquinasPermitidas: ['EXT-PE-01', 'EXT-PE-02'],
            esInicioCadena: true,
            procesosAguasAbajo: [7, 9],
            restriccionesInicio: [
                'Máquina en mantenimiento',
                'Falta de materia prima',
                'Temperatura fuera de rango al arranque',
                'Fallo de equipos auxiliares: bomba de agua, enfriador, compresor',
                'Espesor nominal de la orden no definido'
            ],

            // ─────────────────────────────────────────────
            // PARÁMETROS DE CALIDAD
            // Se registran por rollo individual.
            // ─────────────────────────────────────────────
            parametrosCalidad: [
                {
                    nombre: 'espesor_mm',
                    etiqueta: 'Espesor',
                    unidad: 'mm',
                    // El nominal viene obligatoriamente de la orden de producción.
                    // Si la orden SAP no lo trae definido, debe esclarecerse
                    // antes de iniciar producción (campo bloqueante).
                    nominal: 'desde_orden',
                    tolerancia: null,
                    // Sin tolerancia: cualquier valor distinto al nominal es No cumple
                    // y obliga a corrección inmediata. No se tolera ninguna diferencia.
                    // Si el inspector decide destruir producción fuera de rango,
                    // debe justificarlo con texto libre (mínimo 10 caracteres).
                    critico: true,
                    calculado: false,
                    validacion: 'exacto_vs_nominal',
                    nota: 'Sin tolerancia numérica. Desviación = No cumple inmediato. ' +
                          'Corrección obligatoria antes de continuar producción.'
                },
                {
                    nombre: 'ancho_burbuja',
                    etiqueta: 'Ancho de Burbuja',
                    unidad: 'pulgadas',
                    // El nominal viene de la orden de producción.
                    nominal: 'desde_orden',
                    tolerancia: {
                        tipo: 'simetrica',
                        valor: 0.25,
                        unidad: 'pulgadas',
                        descripcion: '±¼"'
                    },
                    critico: false,
                    calculado: false,
                    validacion: 'rango_vs_nominal',
                    // NOTA PARA FRONTEND: todas las medidas en pulgadas deben
                    // mostrarse y capturarse como fracciones en múltiplos de 1/8.
                    // Ejemplo: 12½" se ingresa como 12 4/8, no como 12.5.
                    notaFrontend: 'Medida en pulgadas. Usar fracciones en múltiplos ' +
                                  'de 1/8. Nunca decimales.'
                },
                {
                    nombre: 'microperforado',
                    etiqueta: 'Microperforado',
                    unidad: null,
                    tipo: 'booleano_inspeccion',
                    // Inspección visual. Cumple si el estado de perforación de la
                    // bobina coincide con lo especificado en la orden.
                    // Todas las órdenes tienen este campo definido.
                    // Si una orden no lo trae, el sistema debe requerirlo antes
                    // de permitir el registro de producción (campo bloqueante).
                    nominal: 'desde_orden',
                    critico: true,
                    calculado: false,
                    validacion: 'coincidencia_booleana_vs_orden',
                    metodologia: 'Inspección visual. Verificar que la bobina fue ' +
                                 'perforada (o no) según especificación de la orden.'
                }
            ],

            // ─────────────────────────────────────────────
            // PARÁMETROS OPERATIVOS
            // PENDIENTE: temperaturas de zonas, RPM, velocidad de línea,
            // presión de cabezal y demás parámetros de máquina.
            // Se completarán en una iteración futura con el equipo de planta.
            // ─────────────────────────────────────────────
            parametrosInformativos: [
                {
                    nombre: 'materias_primas',
                    etiqueta: 'Materias Primas',
                    grupo: 'materias_primas',
                    tipo: 'lista_dinamica',
                    // Solo se registran las materias primas realmente usadas en el turno.
                    // La suma de porcentajes debe ser exactamente 100% (±0.01 tolerancia).
                    // Máximo 5 materiales activos simultáneamente.
                    reglaSuma: 'porcentajes_suman_100',
                    campos: [
                        { nombre: 'tipo',       etiqueta: 'Tipo',          unidad: '' },
                        { nombre: 'marca',      etiqueta: 'Marca',         unidad: '' },
                        { nombre: 'lote',       etiqueta: 'Lote',          unidad: '' },
                        { nombre: 'porcentaje', etiqueta: '% de uso',      unidad: '%' }
                    ],
                    opcionesTipo: [
                        // Materiales habituales — presentes en la mayoría de turnos
                        'LLDPE',
                        'LDPE',
                        'Reciclado',
                        // Materiales ocasionales — solo para pedidos con color
                        'Masterbatch colorante',
                        // Material de uso muy raro — problema de materia prima
                        // sin aditivo anti bloqueo incorporado
                        'Anti bloqueo'
                    ],
                    nota: 'Registrar solo los materiales realmente utilizados. ' +
                          'Anti bloqueo aplica únicamente cuando la materia prima ' +
                          'base no incluye el aditivo de fábrica.'
                },
                // ── PARÁMETROS DE MÁQUINA — PENDIENTE ──────────────────────
                // Los siguientes grupos quedan pendientes hasta relevar con planta:
                //   - temperaturas: zonas de extrusora, cabezal, labios
                //   - maquina: RPM tornillo, velocidad de línea (m/min),
                //              presión cabezal (bar)
                // Se agregarán en la próxima versión del contrato.
                // ────────────────────────────────────────────────────────────
            ],

            // ─────────────────────────────────────────────
            // FRECUENCIA DE MUESTREO
            // 4 lecturas por turno por máquina activa.
            // Cada lectura corresponde a una bobina bajada.
            // ─────────────────────────────────────────────
            frecuenciaMuestreo: {
                lecturasPorTurno: 4,
                unidadLectura: 'por_rollo',
                descripcion: 'Se toman 4 lecturas de calidad por turno por cada ' +
                             'máquina en operación. Normalmente coinciden con las ' +
                             '4 bajadas de rollo del turno.',
                omisionRequiereMotivo: true,
                omisionJustificacion: 'Consultar catálogo de causas de paro. ' +
                                      'Si la máquina estuvo parada, se documenta ' +
                                      'el paro y la lectura se omite con justificación.',
                permiteCopiarMuestraAnterior: false,
                nota: 'Las máquinas pueden operar de forma independiente. ' +
                      'Cada equipo activo genera sus propias 4 lecturas. ' +
                      'Si solo opera EXT-PE-01, solo esa máquina genera registros.'
            },

            motivo: 'Contrato inicial completo para proceso de Extrusión PE. ' +
                    'Define 2 máquinas independientes (EXT-PE-01, EXT-PE-02), ' +
                    'producción por pesaje de rollos individuales en kg, ' +
                    '3 parámetros de calidad por rollo (espesor sin tolerancia, ' +
                    'ancho burbuja ±¼", microperforado visual), materias primas ' +
                    'con trazabilidad de marca/lote/porcentaje, y generación de ' +
                    'lote por rollo con correlativo que reinicia por orden. ' +
                    'Parámetros operativos de máquina pendientes de relevar.'
        });

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE PRODUCCIÓN
        // La producción no se mide por contador acumulado sino por pesaje
        // individual de cada rollo al bajarlo de la máquina.
        // ─────────────────────────────────────────────────────────────────
        this.reglasProduccion = {
            modalidad: 'pesaje_por_rollo',
            rollosPorTurno: 2,
            descripcion: 'Por turno se bajan normalmente 2 rollos por máquina. ' +
                         'Cada rollo se pesa en kg al retirarse de la máquina. ' +
                         'La producción total del turno es la suma de los pesos ' +
                         'de todos los rollos bajados.',
            camposPorRollo: [
                { nombre: 'peso_kg',      etiqueta: 'Peso',          unidad: 'kg',      obligatorio: true },
                { nombre: 'ancho_real',   etiqueta: 'Ancho Real',    unidad: 'pulgadas', obligatorio: true,
                  nota: 'Fracciones en múltiplos de 1/8. Tolerancia ±¼" vs. nominal de orden.' },
                { nombre: 'observaciones', etiqueta: 'Observaciones', unidad: null,      obligatorio: false }
            ]
        };

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE LOTE
        // Diferencia clave vs. ExtrusorPP:
        //   - ExtrusorPP: 1 lote por orden+bitácora, correlativo histórico nunca reinicia.
        //   - ExtrusorPE: 1 lote por rollo individual, correlativo reinicia al cambiar orden.
        // ─────────────────────────────────────────────────────────────────
        this.reglasLote = {
            generacion: 'automatica',
            descripcion: 'Cada rollo bajado genera su propio lote. ' +
                         'El correlativo cuenta los rollos producidos por esa orden ' +
                         'en esta máquina y reinicia a 001 cuando cambia la orden.',
            codigoFormato: '{codigo_orden}-EXTPE{NN}-{correlativo_3_digitos}',
            codigoEjemplo: '6000123-EXTPE01-001',
            componentesFormato: {
                codigo_orden:        '7 dígitos de la orden (ej: 6000123)',
                EXTPE:               'Prefijo fijo del proceso',
                NN:                  'Número de máquina sin guión (01 o 02)',
                correlativo:         '3 dígitos con cero a la izquierda (001, 002...)'
            },
            correlativo: {
                alcance: 'por_orden_por_maquina',
                reinicia: 'al_cambiar_orden',
                descripcion: 'El correlativo cuenta los rollos que ha producido ' +
                             'esa máquina para esa orden. Al asignarse una nueva ' +
                             'orden, el correlativo vuelve a 001. ' +
                             'DIFERENCIA con ExtrusorPP: allí el correlativo es ' +
                             'histórico y nunca reinicia.',
                formato: '3 dígitos con cero a la izquierda'
            },
            estadosLote: ['activo', 'pausado', 'cerrado'],
            responsableGeneracion: 'sistema',
            momentoGeneracion: 'al registrar el pesaje de cada rollo'
        };

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE ESPECIFICACIONES DE ORDEN
        // Campos que deben estar definidos antes de permitir producción.
        // Si no vienen en la importación SAP, se bloquea hasta confirmar.
        // ─────────────────────────────────────────────────────────────────
        this.reglasEspecificacionesOrden = {
            camposObligatoriosAntesDePRoducir: [
                {
                    campo: 'espesor_mm',
                    etiqueta: 'Espesor (mm)',
                    nota: 'Viene de SAP. Si no está definido en la orden, ' +
                          'debe esclarecerse en el momento de la importación ' +
                          'masiva o al crear la orden manualmente. ' +
                          'Campo bloqueante: no se puede registrar producción sin él.'
                },
                {
                    campo: 'ancho_nominal',
                    etiqueta: 'Ancho Nominal (pulgadas)',
                    nota: 'Viene de SAP vía parser (campo ancho_nominal del proceso 6). ' +
                          'Fracciones en múltiplos de 1/8. Campo bloqueante.'
                },
                {
                    campo: 'microperforado',
                    etiqueta: 'Microperforado (Sí/No)',
                    nota: 'Viene de SAP. Si no está definido, el sistema debe ' +
                          'solicitarlo explícitamente. Campo bloqueante.'
                }
            ]
        };
    }
}

module.exports = ExtrusionPEContract;
