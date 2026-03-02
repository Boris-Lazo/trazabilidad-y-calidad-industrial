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
            maquinasPermitidas: ['EXTPE01', 'EXTPE02'],
            esInicioCadena: true,
            procesosAguasAbajo: [7, 9],
            restriccionesInicio: [
                'Máquina en mantenimiento',
                'Falta de materia prima',
                'Temperatura fuera de rango al arranque',
                'Fallo de equipos auxiliares: bomba de agua, enfriador, compresor',
                'Espesor nominal de la orden no definido'
            ],
            parametrosCalidad: [
                {
                    nombre: 'espesor_mm',
                    etiqueta: 'Espesor',
                    unidad: 'mm',
                    nominal: 'desde_orden',
                    tolerancia: null,
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
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5", no 12 4/8"). ' +
                                  'Valores válidos: 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8. ' +
                                  'Nunca decimales.'
                },
                {
                    nombre: 'microperforado',
                    etiqueta: 'Microperforado',
                    unidad: null,
                    tipo: 'booleano_inspeccion',
                    nominal: 'desde_orden',
                    critico: true,
                    calculado: false,
                    validacion: 'coincidencia_booleana_vs_orden',
                    metodologia: 'Inspección visual. Verificar que la bobina fue ' +
                                 'perforada (o no) según especificación de la orden.'
                }
            ],
            parametrosInformativos: [
                {
                    nombre: 'materias_primas',
                    etiqueta: 'Materias Primas',
                    grupo: 'materias_primas',
                    tipo: 'lista_dinamica',
                    reglaSuma: 'porcentajes_suman_100',
                    campos: [
                        { nombre: 'tipo',       etiqueta: 'Tipo',     unidad: '' },
                        { nombre: 'marca',      etiqueta: 'Marca',    unidad: '' },
                        { nombre: 'lote',       etiqueta: 'Lote',     unidad: '' },
                        { nombre: 'porcentaje', etiqueta: '% de uso', unidad: '%' }
                    ],
                    opcionesTipo: [
                        'LLDPE',
                        'LDPE',
                        'Reciclado',
                        'Masterbatch colorante',
                        'Anti bloqueo'
                    ],
                    nota: 'Registrar solo los materiales realmente utilizados. ' +
                          'Anti bloqueo aplica únicamente cuando la materia prima ' +
                          'base no incluye el aditivo de fábrica.'
                }
                // PENDIENTE: temperaturas, RPM, velocidad de línea, presión de cabezal.
                // Se agregarán en próxima iteración con el equipo de planta.
            ],
            frecuenciaMuestreo: {
                lecturasPorTurno: 4,
                unidadLectura: 'por_rollo',
                descripcion: 'Se toman 4 lecturas de calidad por turno por cada ' +
                             'máquina en operación. Normalmente coinciden con las ' +
                             '4 bajadas de rollo del turno.',
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false,
                nota: 'Las máquinas pueden operar de forma independiente. ' +
                      'Cada equipo activo genera sus propias 4 lecturas.'
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

        this.reglasProduccion = {
            modalidad: 'pesaje_por_rollo',
            rollosPorTurno: 2,
            descripcion: 'Por turno se bajan normalmente 2 rollos por máquina. ' +
                         'Cada rollo se pesa en kg al retirarse de la máquina. ' +
                         'La producción total del turno es la suma de los pesos ' +
                         'de todos los rollos bajados.',
            camposPorRollo: [
                { nombre: 'peso_kg',       etiqueta: 'Peso',          unidad: 'kg',       obligatorio: true },
                { nombre: 'ancho_real',    etiqueta: 'Ancho Real',    unidad: 'pulgadas', obligatorio: true,
                  notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                'Ej: 12 1/2" (no 12.5"). Nunca decimales.' },
                { nombre: 'observaciones', etiqueta: 'Observaciones', unidad: null,       obligatorio: false }
            ]
        };

        this.reglasLote = {
            generacion: 'automatica',
            descripcion: 'Cada rollo bajado genera su propio lote. ' +
                         'El correlativo cuenta los rollos producidos por esa orden ' +
                         'en esta máquina y reinicia a 001 cuando cambia la orden.',
            codigoFormato: '{codigo_orden}-EXTPE{NN}-{correlativo_3_digitos}',
            codigoEjemplo: '6000123-EXTPE01-001',
            componentesFormato: {
                codigo_orden: '7 dígitos de la orden (ej: 6000123)',
                EXTPE:        'Prefijo fijo del proceso',
                NN:           'Número de máquina (01 o 02), coincide con el sufijo de EXTPE01 / EXTPE02',
                correlativo:  '3 dígitos con cero a la izquierda (001, 002...)'
            },
            correlativo: {
                alcance: 'por_orden_por_maquina',
                reinicia: 'al_cambiar_orden',
                descripcion: 'DIFERENCIA con ExtrusorPP: allí el correlativo es ' +
                             'histórico y nunca reinicia. Aquí reinicia al cambiar orden.',
                formato: '3 dígitos con cero a la izquierda'
            },
            estadosLote: ['activo', 'pausado', 'cerrado'],
            responsableGeneracion: 'sistema',
            momentoGeneracion: 'al registrar el pesaje de cada rollo'
        };

        this.reglasEspecificacionesOrden = {
            camposObligatoriosAntesDePRoducir: [
                {
                    campo: 'espesor_mm',
                    etiqueta: 'Espesor (mm)',
                    nota: 'Viene de SAP. Si no está definido, debe esclarecerse ' +
                          'en importación o al crear la orden. Campo bloqueante.'
                },
                {
                    campo: 'ancho_nominal',
                    etiqueta: 'Ancho Nominal (pulgadas)',
                    nota: 'Viene de SAP vía parser. Campo bloqueante.',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5"). Nunca decimales.'
                },
                {
                    campo: 'microperforado',
                    etiqueta: 'Microperforado (Sí/No)',
                    nota: 'Viene de SAP. Si no está definido, el sistema debe ' +
                          'solicitarlo. Campo bloqueante.'
                }
            ]
        };
    }
}

module.exports = ExtrusionPEContract;
