const ProcessContract = require('./ProcessContract');

class PeletizadoContract extends ProcessContract {
    constructor() {
        super({
            processId: 8,
            nombre: 'Peletizado',
            nombreCorto: 'Peletizado',
            unidadProduccion: 'kg',
            descripcionProducto: 'Pellets de polipropileno reciclado producidos ' +
                                 'a partir del desperdicio de procesos PP. ' +
                                 'Destino: materia prima para Extrusor PP (proceso 1), ' +
                                 'Laminado (proceso 3), o venta como producto terminado.',
            patronCodigoOrden: '8\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            maquinasPermitidas: ['PELET-01'],
            esInicioCadena: false,
            // Recibe desperdicio de procesos PP (1,2,3,4,5,9).
            // No recibe material de procesos PE (6,7) ni el liner del proceso 9.
            procesosAguasAbajo: [],
            restriccionesInicio: [
                'Sin material de desperdicio disponible',
                'Máquina en mantenimiento',
                'Temperatura fuera de rango al arranque'
            ],

            // ─────────────────────────────────────────────
            // PARÁMETROS DE CALIDAD
            // 2 inspecciones por turno: inicio y cierre.
            // Solo se verifica color y tipo de material.
            // No hay parámetros numéricos con tolerancia.
            // ─────────────────────────────────────────────
            parametrosCalidad: [
                {
                    nombre: 'color_pelet',
                    etiqueta: 'Color del Pelet',
                    unidad: null,
                    tipo: 'texto_libre',
                    critico: false,
                    calculado: false,
                    validacion: 'inspeccion_visual',
                    metodologia: 'Inspección visual del color del pelet de salida.'
                },
                {
                    nombre: 'tipo_material',
                    etiqueta: 'Tipo de Material Procesado',
                    unidad: null,
                    tipo: 'texto_libre',
                    critico: false,
                    calculado: false,
                    validacion: 'declarativo',
                    nota: 'Descripción del tipo de desperdicio que se está procesando ' +
                          'en el turno. Ej: "Recortes de telares", "Merma de imprenta", ' +
                          '"Mixto PP".'
                }
            ],

            // ─────────────────────────────────────────────
            // PARÁMETROS OPERATIVOS — PENDIENTE
            // Temperaturas, RPM y demás parámetros de máquina
            // se definirán en una iteración futura.
            // ─────────────────────────────────────────────
            parametrosInformativos: [],

            frecuenciaMuestreo: {
                registrosFormalsPorTurno: 2,
                distribucion: [
                    { indice: 1, momento: 'inicio_turno',  descripcion: 'Inspección al iniciar el turno' },
                    { indice: 2, momento: 'cierre_turno',  descripcion: 'Inspección al finalizar el turno' }
                ],
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },

            motivo: 'Contrato inicial completo para proceso de Peletizado. ' +
                    'Define 1 máquina (PELET-01), producción por pesaje de pelet ' +
                    'de salida en kg con registro de merma, 2 parámetros de calidad ' +
                    'cualitativos (color y tipo de material), 2 inspecciones por turno ' +
                    '(inicio y cierre), sin gestión de lotes. ' +
                    'Parámetros operativos de máquina pendientes.'
        });

        // procesosAguasArriba no está en ProcessContract base.
        // Recibe desperdicio de procesos PP únicamente.
        // No recibe material de procesos PE (6, 7) ni liner del proceso 9.
        this.procesosAguasArriba = [1, 2, 3, 4, 5, 9];

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE PRODUCCIÓN
        // Se registra el pelet de salida (kg) y la merma (kg).
        // La merma es el desperdicio que va directamente a la basura.
        // No se gestionan lotes — el pelet se identifica físicamente
        // con fecha de producción, grupo y turno escritos en las bolsas.
        // ─────────────────────────────────────────────────────────────────
        this.reglasProduccion = {
            modalidad: 'pesaje_salida',
            descripcion: 'Se registran los kg de pelet producido (salida) y los ' +
                         'kg de merma (desperdicio que va a la basura). ' +
                         'No hay contador acumulado — cada turno es un pesaje independiente.',
            unidad: 'kg',
            camposProduccion: {
                kg_pelet_producido: {
                    etiqueta: 'Pelet Producido',
                    unidad: 'kg',
                    obligatorio: true,
                    nota: 'Peso total del pelet de salida en el turno.'
                },
                kg_merma: {
                    etiqueta: 'Merma',
                    unidad: 'kg',
                    obligatorio: true,
                    nota: 'Desperdicio del proceso que va a la basura. ' +
                          'No es reutilizable.'
                }
            },
            identificacionFisica: {
                descripcion: 'El pelet se empaca en bolsas de 25 kg. Cada bolsa ' +
                             'se identifica físicamente con fecha de producción, ' +
                             'grupo y turno escritos directamente en la bolsa.',
                nota: 'Esta identificación es operativa/logística. ' +
                      'El sistema no gestiona lotes de pelet.'
            },
            sinGestionLotes: true
        };

        // ─────────────────────────────────────────────────────────────────
        // MATERIAL DE ENTRADA
        // Desperdicio PP de procesos 1, 2, 3, 4, 5 y 9.
        // No entra material de los extrusores PE (procesos 6 y 7).
        // No entra el liner de los sacos vestidos (proceso 9).
        // Se declara por tipo de material, no por lote de origen.
        // ─────────────────────────────────────────────────────────────────
        this.reglasMaterialEntrada = {
            descripcion: 'La peletizadora recibe desperdicio PP de los procesos ' +
                         '1, 2, 3, 4, 5 y 9 (excluido el liner PE del proceso 9). ' +
                         'El material se registra por tipo, no por lote de origen.',
            procesosOrigen: [1, 2, 3, 4, 5, 9],
            exclusiones: [
                'Desperdicio de Extrusor PE (proceso 6) — tiene su propio método de reciclaje',
                'Desperdicio de Conversión Liner PE (proceso 7) — ídem',
                'Liner de PE de sacos vestidos (proceso 9) — material PE, no PP'
            ],
            registroPorTipo: true,
            camposEntrada: {
                tipo_material: {
                    etiqueta: 'Tipo de Material',
                    tipo: 'texto_libre',
                    obligatorio: true,
                    nota: 'Descripción del desperdicio procesado. ' +
                          'Ej: "Recortes de telares", "Merma de imprenta", "Mixto PP".'
                },
                kg_entrada: {
                    etiqueta: 'Material Ingresado',
                    unidad: 'kg',
                    obligatorio: true,
                    nota: 'Peso total del desperdicio que entró a procesar en el turno.'
                }
            }
        };

        // ─────────────────────────────────────────────────────────────────
        // DESTINOS DEL PELET
        // ─────────────────────────────────────────────────────────────────
        this.reglasDestino = {
            descripcion: 'El pelet producido puede tener tres destinos.',
            destinos: [
                {
                    id: 'EXTRUSOR_PP',
                    nombre: 'Extrusor PP (proceso 1)',
                    descripcion: 'Reingresa como materia prima reciclada (Pelet ciclado) ' +
                                 'en la mezcla del Extrusor PP.'
                },
                {
                    id: 'LAMINADO',
                    nombre: 'Laminado (proceso 3)',
                    descripcion: 'Reingresa como materia prima reciclada en la ' +
                                 'cortina del proceso de Laminado.'
                },
                {
                    id: 'VENTA',
                    nombre: 'Venta',
                    descripcion: 'Sale de planta como producto terminado.'
                }
            ]
        };
    }
}

module.exports = PeletizadoContract;
