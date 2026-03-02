/**
 * @file ConversionSacosContract.js
 * @description Contrato de proceso para el área de Conversión de Sacos.
 * Define las reglas de negocio, parámetros de calidad, frecuencia de muestreo
 * y especificaciones técnicas para el corte y costura de sacos.
 */

const ProcessContract = require('./ProcessContract');

class ConversionSacosContract extends ProcessContract {
    constructor() {
        super({
            processId: 5,
            nombre: 'Conversión de Sacos',
            nombreCorto: 'ConverSA',
            unidadProduccion: 'unidades',
            descripcionProducto: 'saco de polipropileno con fondo costurado, listo para llenado',
            patronCodigoOrden: '5\\d{6}',
            origenesOrden: ['manual', 'masivo_excel'],
            esInicioCadena: false,
            procesosAguasArriba: [4],
            procesosAguasAbajo: [],
            rolesOperativosPermitidos: [
                'Inspector de calidad',
                'Técnico operador',
                'Auxiliar de operaciones'
            ],
            restriccionesInicio: [
                'Sin rollos de tela impresa disponibles',
                'Falla mecánica de la convertidora',
                'Cambio de orden en proceso',
                'Rotura de hilo de costura'
            ],
            maquinasPermitidas: ['CONV#01', 'CONV#02', 'CONV#03'],
            parametrosCalidad: [
                {
                    nombre: 'ancho_saco',
                    etiqueta: 'Ancho del Saco',
                    unidad: 'pulgadas',
                    nominal: null,
                    tolerancia: 0.25,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica. Tolerancia fija ±0.25 pulgadas sobre nominal de la orden.'
                },
                {
                    nombre: 'largo_saco',
                    etiqueta: 'Largo del Saco',
                    unidad: 'pulgadas',
                    nominal: null,
                    tolerancia: 0.25,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica. Tolerancia fija ±0.25 pulgadas sobre nominal de la orden.'
                },
                {
                    nombre: 'doble_costura',
                    etiqueta: 'Doble de Costura del Fondo',
                    unidad: 'pulgadas',
                    nominal: null,
                    tolerancia: 0.125,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física del doblez del fondo costurado. Un solo doblez por saco. Tolerancia ±1/8 de pulgada sobre nominal de la orden.'
                },
                {
                    nombre: 'puntadas_costura',
                    etiqueta: 'Puntadas por 10 cm',
                    unidad: 'puntadas/10cm',
                    nominal: 13,
                    tolerancia: 1,
                    minimo: 12,
                    maximo: 14,
                    critico: true,
                    calculado: false,
                    metodologia: 'Conteo manual de puntadas en una longitud de 10 cm de costura. Rango aceptable: 12 a 14 puntadas por 10 cm. Nominal: 13.'
                }
            ],
            frecuenciaMuestreo: {
                muestrasMinTurno: 4,
                distribucion: [
                    { indice: 1, momento: 'primera_inspeccion', descripcion: 'Primera inspección del turno' },
                    { indice: 2, momento: 'segunda_inspeccion', descripcion: 'Segunda inspección del turno' },
                    { indice: 3, momento: 'tercera_inspeccion', descripcion: 'Tercera inspección del turno' },
                    { indice: 4, momento: 'cuarta_inspeccion', descripcion: 'Cuarta inspección del turno' }
                ],
                sinRestriccionTiempo: true,
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },
            version: '1.0.0',
            fechaCreacion: '2025-01-01',
            responsable: 'Sistema (Despliegue)',
            motivo: 'Contrato inicial completo para proceso de Conversión de Sacos. Define 3 máquinas con regla de asignación dura para CONV-03 (solo disponible si con_fuelle = false Y microperforado = false), consumo de rollos impresos por código individual, producción en sacos por rollo, 4 inspecciones de calidad por turno (ancho, largo, doble costura, puntadas 12-14 por 10cm), muestra física por orden con peso real sin nominal, defectos clasificados por origen (Telares, Imprenta, Laminado) con descripción libre y conteo de sacos afectados, desperdicio en kg con destino a Peletizado, y especificaciones de orden con validación manual de fuelle y posición de costura.'
        });

        this.totalMaquinas = 3;
        this.procesosAguasArriba = [4];

        this.reglasAsignacionMaquina = {
            'CONV#01': {
                descripcion: 'Convertidora 1. Disponible para cualquier orden del proceso 5 sin restricciones.',
                restricciones: []
            },
            'CONV#02': {
                descripcion: 'Convertidora 2. Disponible para cualquier orden del proceso 5 sin restricciones.',
                restricciones: []
            },
            'CONV#03': {
                descripcion: 'Máquina perteneciente al proceso 9 (Conversión Sacos Vestidos), ' +
                             'disponible en préstamo para proceso 5 únicamente cuando la orden ' +
                             'no lleva fuelle Y no es microperforada. ' +
                             'Su proceso base es el 9 — en el seed tiene proceso_id = 9.',
                restricciones: [
                    {
                        campo: 'con_fuelle',
                        valorRequerido: false,
                        descripcion: 'CONV#03 no puede usarse si el saco lleva fuelle.',
                        mensajeBloqueo: 'Esta máquina no está disponible para sacos con fuelle.'
                    },
                    {
                        campo: 'microperforado',
                        valorRequerido: false,
                        descripcion: 'CONV#03 no puede usarse si el saco es microperforado.',
                        mensajeBloqueo: 'Esta máquina no está disponible para sacos microperforados.'
                    }
                ],
                nota: 'Si con_fuelle = true O microperforado = true, el sistema debe bloquear ' +
                      'la selección de CONV#03 con mensaje explicativo al operario.'
            }
        };

        this.operaciones = {
            descripcion: 'La convertidora corta la tela impresa a la longitud definida por la orden y costura uno de los fondos del saco. El saco sale con un extremo costurado y uno abierto, listo para ser llenado.',
            pasos: ['corte', 'costura_fondo'],
            productoEntrada: 'rollo de tela impresa (proceso 4)',
            productoSalida: 'saco con fondo costurado'
        };

        this.reglasProduccion = {
            metodo: 'conteo_unidades',
            descripcion: 'La producción se cuenta en sacos terminados. Por cada rollo procesado se registra el código del rollo y los sacos producidos de ese rollo.',
            unidad: 'unidades',
            registroPorRollo: true,
            registroPorCambioDeOrden: true
        };

        this.reglasRollosEntrada = {
            descripcion: 'Conversión consume rollos impresos del proceso 4 (Imprenta). Cada rollo se registra individualmente por su código.',
            origenProceso: 4,
            formatoCodigo: 'R{3_digitos}-T{2_digitos}-L{3_digitos}',
            ejemploCodigo: 'R047-T05-L001',
            notaCodigo: 'El operario escribe el código manualmente. Si el código existe en la base de datos, el sistema muestra los datos del rollo como referencia. Si no existe, se permite entrada libre sin bloquear el registro.',
            camposRegistroPorRollo: {
                codigo_rollo: 'string obligatorio',
                sacos_producidos: 'número entero obligatorio',
                orden_id: 'FK orden de producción proceso 5'
            }
        };

        this.muestraFisica = {
            descripcion: 'De cada orden procesada en el turno se retiene una muestra física del saco terminado. Se registran sus características como evidencia de calidad. No tiene nominales ni rangos de cumplimiento — es registro informativo.',
            frecuencia: 'una_por_orden',
            camposRegistro: {
                ancho_muestra: 'número en pulgadas',
                largo_muestra: 'número en pulgadas',
                peso_muestra_gramos: 'número en gramos. Solo se registra el valor real, sin comparación contra nominal.',
                orden_id: 'FK orden de producción proceso 5',
                observaciones: 'texto libre opcional'
            }
        };

        this.reglasDefectos = {
            descripcion: 'Durante el corte y costura se identifican defectos que provienen de procesos anteriores. Se clasifican por origen y se describe el defecto en texto libre.',
            listaFija: true,
            origenesDefecto: [
                {
                    id: 'DEF-TELAR',
                    nombre: 'Defecto de Telares',
                    descripcion: 'Defecto originado en el proceso de tejido: tela picada, cintas incorrectas, rollo mal embobinado u otros.'
                },
                {
                    id: 'DEF-IMPRENTA',
                    nombre: 'Defecto de Imprenta',
                    descripcion: 'Defecto originado en el proceso de impresión: mala impresión, colores incorrectos, registro desviado u otros.'
                },
                {
                    id: 'DEF-LAMINADO',
                    nombre: 'Defecto de Laminado',
                    descripcion: 'Defecto originado en el proceso de laminado: mala adherencia, ancho incorrecto, cortina irregular u otros.'
                }
            ],
            camposRegistroDefecto: {
                origen_id: 'DEF-TELAR | DEF-IMPRENTA | DEF-LAMINADO, obligatorio',
                descripcion_defecto: 'texto libre obligatorio, mínimo 10 caracteres',
                cantidad_sacos_afectados: 'número entero obligatorio, mayor que 0',
                orden_id: 'FK orden de producción proceso 5'
            },
            nota: 'Los defectos se registran a nivel de orden, no de rollo. Un defecto puede afectar varios sacos de la misma orden. El registro alimenta KPIs de calidad por proceso origen para trazabilidad de defectos entre procesos.'
        };

        this.reglasDesperdicio = {
            unidad: 'kg',
            descripcion: 'El desperdicio de conversión se registra en kg por turno. Incluye retazos de corte y sacos rechazados por defecto.',
            destinos: ['Peletizado', 'Descarte final'],
            registroObligatorio: true
        };

        this.reglasOrden = {
            descripcion: 'Las especificaciones técnicas de la orden definen los nominales de calidad y las características del saco a producir.',
            camposEspecificacionesOrden: {
                ancho_saco: 'numérico en pulgadas',
                largo_saco: 'numérico en pulgadas',
                doble_costura: 'numérico en pulgadas',
                peso_contenido_kg: 'numérico',
                tipo_tejido: 'según diccionario de prefijos (LB, LV, LC, TB, TBuff)',
                con_fuelle: {
                    tipo: 'boolean',
                    descripcion: 'true: saco con fuelle lateral. false: saco plano.',
                    nota: 'No viene en la orden SAP. Debe ser confirmado manualmente al importar o crear la orden. Determina disponibilidad de CONV-03.'
                },
                microperforado: {
                    tipo: 'boolean',
                    nota: 'Determina disponibilidad de CONV-03.'
                },
                sin_impresion: {
                    tipo: 'boolean',
                    nota: 'Si es true, el saco no lleva impresión y puede provenir de Laminado o Telares directamente, no de Imprenta.'
                },
                costura_posicion: {
                    tipo: 'string',
                    valores: ['arriba', 'abajo'],
                    nota: 'Define en qué extremo del saco queda la costura del fondo. Se define en Imprenta según el montaje. Debe confirmarse manualmente al importar o crear la orden.'
                }
            }
        };
    }
}

module.exports = ConversionSacosContract;
