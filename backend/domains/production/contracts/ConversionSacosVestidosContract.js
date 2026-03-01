const ProcessContract = require('./ProcessContract');

class ConversionSacosVestidosContract extends ProcessContract {
    constructor() {
        super({
            processId: 9,
            nombre: 'Conversión de Sacos Vestidos',
            nombreCorto: 'Conv. Sacos Vestidos',
            unidadProduccion: 'unidades',
            descripcionProducto: 'Sacos de polipropileno con liner de polietileno ' +
                                 'insertado — corte, costura de fondo y vestido en ' +
                                 'un solo proceso',
            patronCodigoOrden: '9\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            // Máquina exclusiva. CONV-03 no puede procesar órdenes con
            // con_fuelle = true ni microperforado = true.
            maquinasPermitidas: ['CONV-03'],
            esInicioCadena: false,
            // Consume rollos de tela/laminado/impreso (2, 3 o 4 según orden)
            // y rollo de manga PE del proceso 6. NO consume del proceso 5 ni 7.
            // CONV-03 corta sus propios sacos y ensambla el liner en el mismo paso.
            procesosAguasAbajo: [],
            restriccionesInicio: [
                'Sin rollos de tela/laminado/impreso disponibles',
                'Sin rollos de manga PE disponibles',
                'Orden con con_fuelle = true (máquina no puede procesar sacos con fuelle)',
                'Orden con microperforado = true (máquina no puede perforar)',
                'Orden sin dimensiones definidas (ancho, largo o ancho_liner)'
            ],

            // ─────────────────────────────────────────────
            // PARÁMETROS DE CALIDAD
            // Los mismos 4 del proceso 5 + verificación de sello del liner.
            // 4 registros formales por turno.
            // ─────────────────────────────────────────────
            parametrosCalidad: [
                {
                    nombre: 'ancho_saco',
                    etiqueta: 'Ancho del Saco',
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
                    nombre: 'largo_saco',
                    etiqueta: 'Largo del Saco',
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
                    nombre: 'doble_costura',
                    etiqueta: 'Doblez de Fondo (doble costura)',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: {
                        tipo: 'simetrica',
                        valor: 0.125,
                        unidad: 'pulgadas',
                        descripcion: '±⅛"'
                    },
                    critico: false,
                    calculado: false,
                    validacion: 'rango_vs_nominal',
                    nota: 'Solo el doblez del fondo costurado.',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 1 1/2" (no 1.5", no 1 4/8"). ' +
                                  'Valores válidos: 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8. ' +
                                  'Nunca decimales.'
                },
                {
                    nombre: 'puntadas_costura',
                    etiqueta: 'Puntadas de Costura',
                    unidad: 'puntadas/10cm',
                    nominal: 13,
                    minimo: 12,
                    maximo: 14,
                    critico: false,
                    calculado: false,
                    validacion: 'rango_fijo',
                    metodologia: 'Contar puntadas en 10 cm de costura del fondo.'
                },
                {
                    nombre: 'sello_liner',
                    etiqueta: 'Sello del Liner',
                    unidad: null,
                    tipo: 'cumple_no_cumple',
                    nominal: 'Cumple',
                    critico: true,
                    calculado: false,
                    validacion: 'inspeccion_visual',
                    metodologia: 'Inspección visual del sello del liner insertado. ' +
                                 'Verificar que el liner quede correctamente ' +
                                 'posicionado dentro del saco y que el sello sea ' +
                                 'continuo, sin fugas ni despegues.'
                }
            ],

            // ─────────────────────────────────────────────
            // FRECUENCIA DE MUESTREO
            // ─────────────────────────────────────────────
            frecuenciaMuestreo: {
                registrosFormalsPorTurno: 4,
                descripcion: '4 registros formales de calidad por turno.',
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },

            motivo: 'Contrato inicial completo para proceso de Conversión de Sacos ' +
                    'Vestidos. Define CONV-03 como máquina exclusiva con bloqueo duro ' +
                    'para órdenes con con_fuelle = true o microperforado = true. ' +
                    'Consume rollos de tela/laminado/impreso (procesos 2, 3 o 4) y ' +
                    'rollo de manga PE (proceso 6) — no consume de proceso 5 ni 7. ' +
                    'Registra 5 parámetros de calidad (ancho, largo, doble costura, ' +
                    'puntadas, sello liner), muestra física por orden, defectos ' +
                    'clasificados por origen y desperdicio en kg.'
        });

        // procesosAguasArriba no está en ProcessContract base.
        // Proceso 9 puede consumir de 2, 3 o 4 (según orden) y siempre de 6.
        this.procesosAguasArriba = [2, 3, 4, 6];

        // ─────────────────────────────────────────────────────────────────
        // REGLA DE ASIGNACIÓN DE MÁQUINA
        // CONV-03 es la única máquina del proceso 9 y tiene restricciones
        // duras sobre los atributos de la orden.
        // ─────────────────────────────────────────────────────────────────
        this.reglasAsignacionMaquina = {
            'CONV-03': {
                descripcion: 'Vestidora. Máquina exclusiva del proceso 9. ' +
                             'No puede procesar sacos con fuelle ni sacos microperforados.',
                restricciones: [
                    {
                        campo: 'con_fuelle',
                        valorRequerido: false,
                        descripcion: 'CONV-03 no puede procesar sacos con fuelle.',
                        mensajeBloqueo: 'Esta máquina no puede procesar sacos con fuelle.'
                    },
                    {
                        campo: 'microperforado',
                        valorRequerido: false,
                        descripcion: 'CONV-03 no puede perforar material.',
                        mensajeBloqueo: 'Esta máquina no puede procesar sacos microperforados.'
                    }
                ],
                nota: 'Si con_fuelle = true O microperforado = true, el sistema ' +
                      'debe bloquear el registro con mensaje explicativo. ' +
                      'Estas órdenes no pueden procesarse en CONV-03.'
            }
        };

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE PRODUCCIÓN
        // ─────────────────────────────────────────────────────────────────
        this.reglasProduccion = {
            metodo: 'conteo_unidades',
            descripcion: 'La producción se cuenta en sacos vestidos terminados. ' +
                         'Se registra por cada rollo de tela/laminado/impreso ' +
                         'procesado en el turno.',
            unidad: 'unidades'
        };

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE ROLLOS DE ENTRADA
        // Dos flujos independientes de material:
        //   1. Rollo de tela/laminado/impreso (procesos 2, 3 o 4 según orden)
        //   2. Rollo de manga PE (proceso 6)
        // ─────────────────────────────────────────────────────────────────
        this.reglasRollosEntrada = {
            descripcion: 'CONV-03 consume dos tipos de rollo simultáneamente: ' +
                         'el rollo de material de saco (tela, laminado o impreso) ' +
                         'y el rollo de manga PE para el liner.',
            rollosSaco: {
                descripcion: 'Rollos de tela/laminado/impreso según tipo de orden. ' +
                             'El tipo de orden restringe qué proceso puede originar ' +
                             'el rollo — no se declara el tipo manualmente.',
                origenProcesos: [2, 3, 4],
                formatoCodigo: 'Código exacto del rollo tal como viene físicamente ' +
                               'del proceso anterior. Sin modificaciones.',
                multiplicidad: 'Pueden cortarse varios rollos en un mismo turno.',
                camposPorRollo: {
                    codigo_rollo: 'string obligatorio — código físico del rollo',
                    sacos_producidos: 'número entero obligatorio',
                    orden_id: 'FK orden de producción proceso 9'
                }
            },
            rollosPE: {
                descripcion: 'Rollo de manga de polietileno del Extrusor PE ' +
                             '(proceso 6). CONV-03 corta y sella el liner en el ' +
                             'mismo paso que el saco — no pasa por proceso 7.',
                origenProceso: 6,
                formatoCodigo: 'Código de lote exacto del proceso 6. ' +
                               'Formato: {codigo_orden}-EXTPE{NN}-{correlativo_3_digitos}. ' +
                               'Ejemplo: 6000123-EXTPE01-001.',
                estadosPermitidos: ['activo', 'pausado'],
                restriccion: 'No se pueden declarar rollos con lote en estado cerrado.',
                obligatoriedad: 'Al menos un rollo PE debe ser declarado por turno ' +
                                'con producción > 0.',
                camposPorRollo: {
                    codigo_lote_pe: 'string obligatorio — código de lote del proceso 6',
                    orden_id: 'FK orden de producción proceso 9'
                }
            }
        };

        // ─────────────────────────────────────────────────────────────────
        // MUESTRA FÍSICA
        // Una por orden procesada en el turno — registro informativo.
        // ─────────────────────────────────────────────────────────────────
        this.muestraFisica = {
            descripcion: 'De cada orden procesada en el turno se retiene una ' +
                         'muestra física del saco vestido terminado. Registro ' +
                         'informativo, sin nominales ni rangos de cumplimiento.',
            frecuencia: 'una_por_orden',
            camposRegistro: {
                ancho_muestra: {
                    tipo: 'numérico',
                    unidad: 'pulgadas',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5"). Nunca decimales.'
                },
                largo_muestra: {
                    tipo: 'numérico',
                    unidad: 'pulgadas',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5"). Nunca decimales.'
                },
                peso_muestra_gramos: {
                    tipo: 'numérico',
                    unidad: 'gramos',
                    nota: 'Solo valor real. Sin comparación contra nominal.'
                },
                orden_id: 'FK orden de producción proceso 9',
                observaciones: 'texto libre opcional'
            }
        };

        // ─────────────────────────────────────────────────────────────────
        // DEFECTOS — clasificados por origen (igual que proceso 5)
        // ─────────────────────────────────────────────────────────────────
        this.reglasDefectos = {
            descripcion: 'Defectos identificados durante el corte y vestido, ' +
                         'clasificados por el proceso que los originó.',
            listaFija: true,
            origenesDefecto: [
                {
                    id: 'DEF-TELAR',
                    nombre: 'Defecto de Telares',
                    descripcion: 'Tela picada, cintas incorrectas, rollo mal ' +
                                 'embobinado u otros defectos de tejido.'
                },
                {
                    id: 'DEF-IMPRENTA',
                    nombre: 'Defecto de Imprenta',
                    descripcion: 'Mala impresión, colores incorrectos, registro ' +
                                 'desviado u otros defectos de impresión.'
                },
                {
                    id: 'DEF-LAMINADO',
                    nombre: 'Defecto de Laminado',
                    descripcion: 'Mala adherencia, ancho incorrecto, cortina ' +
                                 'irregular u otros defectos de laminado.'
                }
            ],
            camposRegistroDefecto: {
                origen_id: 'DEF-TELAR | DEF-IMPRENTA | DEF-LAMINADO, obligatorio',
                descripcion_defecto: 'texto libre obligatorio, mínimo 10 caracteres',
                cantidad_sacos_afectados: 'número entero obligatorio, mayor que 0',
                orden_id: 'FK orden de producción proceso 9'
            },
            nota: 'Registros a nivel de orden, no de rollo. Alimenta KPIs de ' +
                  'calidad por proceso origen.'
        };

        // ─────────────────────────────────────────────────────────────────
        // DESPERDICIO
        // ─────────────────────────────────────────────────────────────────
        this.reglasDesperdicio = {
            unidad: 'kg',
            descripcion: 'El desperdicio se registra en kg por turno. Incluye ' +
                         'retazos de corte y sacos rechazados por defecto.',
            destinos: ['Peletizado', 'Descarte final'],
            registroObligatorio: true
        };

        // ─────────────────────────────────────────────────────────────────
        // ESPECIFICACIONES DE ORDEN
        // ─────────────────────────────────────────────────────────────────
        this.reglasEspecificacionesOrden = {
            camposEspecificacionesOrden: {
                ancho_saco: {
                    tipo: 'numérico',
                    unidad: 'pulgadas',
                    obligatorio: true,
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5"). Nunca decimales.'
                },
                largo_saco: {
                    tipo: 'numérico',
                    unidad: 'pulgadas',
                    obligatorio: true,
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5"). Nunca decimales.'
                },
                ancho_liner: {
                    tipo: 'numérico',
                    unidad: 'pulgadas',
                    obligatorio: true,
                    default: 'ancho_saco + 1',
                    nota: 'El liner siempre es 1 pulgada más ancho que el saco. ' +
                          'Si no viene en SAP, el sistema aplica el default ' +
                          'ancho_saco + 1 automáticamente. ' +
                          'Patrón SAP: L{numero} en la descripción del producto.',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 13 1/2" (no 13.5"). Nunca decimales.'
                },
                peso_contenido_kg: {
                    tipo: 'numérico',
                    unidad: 'kg',
                    obligatorio: false,
                    nota: 'Informativo. Viene de la orden SAP. No es relevante ' +
                          'para el control de producción de este proceso.'
                },
                microperforado: {
                    tipo: 'boolean',
                    obligatorio: true,
                    nota: 'Si es true, la orden no puede procesarse en CONV-03. ' +
                          'Bloqueo de sistema.',
                    valorBloqueante: true
                },
                con_fuelle: {
                    tipo: 'boolean',
                    obligatorio: true,
                    nota: 'No viene en SAP. Debe confirmarse manualmente. ' +
                          'Si es true, la orden no puede procesarse en CONV-03. ' +
                          'Bloqueo de sistema.',
                    valorBloqueante: true,
                    requiereConfirmacionManual: true
                },
                sin_impresion: {
                    tipo: 'boolean',
                    obligatorio: false,
                    nota: 'Si es true, el rollo de entrada proviene de Laminado ' +
                          'o Telares, no de Imprenta.'
                },
                costura_posicion: {
                    tipo: 'string',
                    valores: ['arriba', 'abajo'],
                    obligatorio: true,
                    nota: 'Define en qué extremo del saco queda la costura del fondo. ' +
                          'Debe confirmarse manualmente.',
                    requiereConfirmacionManual: true
                }
            },
            camposBloqueantesAntesDePRoducir: [
                'ancho_saco', 'largo_saco', 'ancho_liner',
                'con_fuelle', 'costura_posicion'
            ]
        };
    }
}

module.exports = ConversionSacosVestidosContract;
