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
            maquinasPermitidas: ['CONV-03'],
            esInicioCadena: false,
            procesosAguasAbajo: [],
            restriccionesInicio: [
                'Sin rollos de tela/laminado/impreso disponibles',
                'Sin rollos de manga PE disponibles',
                'Orden con con_fuelle = true (máquina no puede procesar sacos con fuelle)',
                'Orden con microperforado = true (máquina no puede perforar)',
                'Orden sin dimensiones definidas (ancho, largo o ancho_liner)'
            ],
            parametrosCalidad: [
                {
                    nombre: 'ancho_saco',
                    etiqueta: 'Ancho del Saco',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: { tipo: 'simetrica', valor: 0.25, unidad: 'pulgadas', descripcion: '±¼"' },
                    critico: false,
                    calculado: false,
                    validacion: 'rango_vs_nominal',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5"). Nunca decimales.'
                },
                {
                    nombre: 'largo_saco',
                    etiqueta: 'Largo del Saco',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: { tipo: 'simetrica', valor: 0.25, unidad: 'pulgadas', descripcion: '±¼"' },
                    critico: false,
                    calculado: false,
                    validacion: 'rango_vs_nominal',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5"). Nunca decimales.'
                },
                {
                    nombre: 'doble_costura',
                    etiqueta: 'Doblez de Fondo (doble costura)',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: { tipo: 'simetrica', valor: 0.125, unidad: 'pulgadas', descripcion: '±⅛"' },
                    critico: false,
                    calculado: false,
                    validacion: 'rango_vs_nominal',
                    nota: 'Solo el doblez del fondo costurado.',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 1 1/2" (no 1.5"). Nunca decimales.'
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
                    metodologia: 'Inspección visual del liner insertado. Verificar que ' +
                                 'quede correctamente posicionado y el sello sea continuo.'
                }
            ],
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
                    'rollo de manga PE (proceso 6). No consume de proceso 5 ni 7. ' +
                    '5 parámetros de calidad, muestra física por orden, defectos ' +
                    'por origen y desperdicio en kg.'
        });

        this.procesosAguasArriba = [2, 3, 4, 6];

        this.reglasAsignacionMaquina = {
            'CONV-03': {
                descripcion: 'Vestidora. Máquina exclusiva del proceso 9. ' +
                             'No puede procesar sacos con fuelle ni microperforados.',
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
                ]
            }
        };

        this.reglasProduccion = {
            metodo: 'conteo_unidades',
            descripcion: 'La producción se cuenta en sacos vestidos terminados, ' +
                         'registrada por cada rollo de tela/laminado/impreso procesado.',
            unidad: 'unidades'
        };

        this.reglasRollosEntrada = {
            descripcion: 'CONV-03 consume dos tipos de rollo simultáneamente: ' +
                         'rollo de material de saco (tela, laminado o impreso) ' +
                         'y rollo de manga PE para el liner.',
            rollosSaco: {
                descripcion: 'Rollos de tela/laminado/impreso según tipo de orden. ' +
                             'El tipo de orden restringe el proceso origen.',
                origenProcesos: [2, 3, 4],
                formatoCodigo: 'Código exacto del rollo tal como viene del proceso anterior.',
                multiplicidad: 'Pueden cortarse varios rollos en un mismo turno.',
                camposPorRollo: {
                    codigo_rollo: 'string obligatorio',
                    sacos_producidos: 'número entero obligatorio',
                    orden_id: 'FK orden de producción proceso 9'
                }
            },
            rollosPE: {
                descripcion: 'Rollo de manga PE del Extrusor PE (proceso 6). ' +
                             'CONV-03 corta y sella el liner en el mismo paso.',
                origenProceso: 6,
                formatoCodigo: 'Código de lote exacto del proceso 6. ' +
                               'Formato: {codigo_orden}-EXTPE{NN}-{correlativo_3_digitos}. ' +
                               'Ejemplo: 6000123-EXTPE01-001.',
                estadosPermitidos: ['activo', 'pausado'],
                restriccion: 'No se pueden declarar rollos con lote en estado cerrado.',
                obligatoriedad: 'Al menos un rollo PE debe ser declarado por turno con producción > 0.',
                camposPorRollo: {
                    codigo_lote_pe: 'string obligatorio — código de lote del proceso 6',
                    orden_id: 'FK orden de producción proceso 9'
                }
            }
        };

        this.muestraFisica = {
            descripcion: 'Una muestra física por orden procesada en el turno. ' +
                         'Registro informativo, sin nominales ni rangos de cumplimiento.',
            frecuencia: 'una_por_orden',
            camposRegistro: {
                ancho_muestra: {
                    tipo: 'numérico', unidad: 'pulgadas',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. Nunca decimales.'
                },
                largo_muestra: {
                    tipo: 'numérico', unidad: 'pulgadas',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. Nunca decimales.'
                },
                peso_muestra_gramos: { tipo: 'numérico', unidad: 'gramos', nota: 'Solo valor real.' },
                orden_id: 'FK orden de producción proceso 9',
                observaciones: 'texto libre opcional'
            }
        };

        this.reglasDefectos = {
            descripcion: 'Defectos identificados durante el corte y vestido, ' +
                         'clasificados por el proceso que los originó.',
            listaFija: true,
            origenesDefecto: [
                { id: 'DEF-TELAR',    nombre: 'Defecto de Telares',  descripcion: 'Tela picada, cintas incorrectas, rollo mal embobinado.' },
                { id: 'DEF-IMPRENTA', nombre: 'Defecto de Imprenta', descripcion: 'Mala impresión, colores incorrectos, registro desviado.' },
                { id: 'DEF-LAMINADO', nombre: 'Defecto de Laminado', descripcion: 'Mala adherencia, ancho incorrecto, cortina irregular.' }
            ],
            camposRegistroDefecto: {
                origen_id: 'DEF-TELAR | DEF-IMPRENTA | DEF-LAMINADO, obligatorio',
                descripcion_defecto: 'texto libre obligatorio, mínimo 10 caracteres',
                cantidad_sacos_afectados: 'número entero obligatorio, mayor que 0',
                orden_id: 'FK orden de producción proceso 9'
            }
        };

        this.reglasDesperdicio = {
            unidad: 'kg',
            descripcion: 'Desperdicio en kg por turno. Incluye retazos y sacos rechazados.',
            destinos: ['Peletizado', 'Descarte final'],
            registroObligatorio: true
        };

        this.reglasEspecificacionesOrden = {
            camposEspecificacionesOrden: {
                ancho_saco:  { tipo: 'numérico', unidad: 'pulgadas', obligatorio: true,
                               notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. Nunca decimales.' },
                largo_saco:  { tipo: 'numérico', unidad: 'pulgadas', obligatorio: true,
                               notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. Nunca decimales.' },
                ancho_liner: { tipo: 'numérico', unidad: 'pulgadas', obligatorio: true,
                               default: 'ancho_saco + 1',
                               nota: 'El liner siempre es 1 pulgada más ancho que el saco. ' +
                                     'Si no viene en SAP, el sistema aplica ancho_saco + 1.',
                               notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. Nunca decimales.' },
                peso_contenido_kg: { tipo: 'numérico', obligatorio: false,
                                     nota: 'Informativo. No relevante para control de producción.' },
                microperforado: { tipo: 'boolean', obligatorio: true,
                                  nota: 'Si es true, bloqueo de sistema — no puede procesarse en CONV-03.' },
                con_fuelle:     { tipo: 'boolean', obligatorio: true,
                                  nota: 'No viene en SAP. Confirmación manual obligatoria. ' +
                                        'Si es true, bloqueo de sistema.',
                                  requiereConfirmacionManual: true },
                sin_impresion:  { tipo: 'boolean', obligatorio: false,
                                  nota: 'Si true, el rollo proviene de Laminado o Telares.' },
                costura_posicion: { tipo: 'string', valores: ['arriba', 'abajo'], obligatorio: true,
                                    nota: 'Confirmación manual obligatoria.',
                                    requiereConfirmacionManual: true }
            },
            camposBloqueantesAntesDePRoducir: [
                'ancho_saco', 'largo_saco', 'ancho_liner', 'con_fuelle', 'costura_posicion'
            ]
        };
    }
}

module.exports = ConversionSacosVestidosContract;
