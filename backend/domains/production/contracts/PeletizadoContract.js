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
            procesosAguasAbajo: [],
            restriccionesInicio: [
                'Sin material de desperdicio disponible',
                'Máquina en mantenimiento',
                'Temperatura fuera de rango al arranque'
            ],
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
                    nota: 'Descripción del tipo de desperdicio procesado en el turno. ' +
                          'Ej: "Recortes de telares", "Merma de imprenta", "Mixto PP".'
                }
            ],
            // PENDIENTE: temperaturas, RPM y demás parámetros de máquina.
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

        this.procesosAguasArriba = [1, 2, 3, 4, 5, 9];

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
                    nota: 'Desperdicio del proceso que va a la basura. No es reutilizable.'
                }
            },
            identificacionFisica: {
                descripcion: 'El pelet se empaca en bolsas de 25 kg identificadas ' +
                             'con fecha de producción, grupo y turno escritos en la bolsa.',
                nota: 'Esta identificación es operativa/logística. ' +
                      'El sistema no gestiona lotes de pelet.'
            },
            sinGestionLotes: true
        };

        this.reglasMaterialEntrada = {
            descripcion: 'Recibe desperdicio PP de los procesos 1, 2, 3, 4, 5 y 9 ' +
                         '(excluido el liner PE del proceso 9). ' +
                         'No entra material de los extrusores PE (procesos 6 y 7).',
            procesosOrigen: [1, 2, 3, 4, 5, 9],
            exclusiones: [
                'Desperdicio de Extrusor PE (proceso 6) — tiene su propio método de reciclaje',
                'Desperdicio de Conversión Liner PE (proceso 7) — ídem',
                'Liner de PE de sacos vestidos (proceso 9) — material PE, no PP'
            ],
            camposEntrada: {
                tipo_material: {
                    etiqueta: 'Tipo de Material',
                    tipo: 'texto_libre',
                    obligatorio: true
                },
                kg_entrada: {
                    etiqueta: 'Material Ingresado',
                    unidad: 'kg',
                    obligatorio: true
                }
            }
        };

        this.reglasDestino = {
            destinos: [
                {
                    id: 'EXTRUSOR_PP',
                    nombre: 'Extrusor PP (proceso 1)',
                    descripcion: 'Reingresa como materia prima reciclada (Pelet ciclado).'
                },
                {
                    id: 'LAMINADO',
                    nombre: 'Laminado (proceso 3)',
                    descripcion: 'Reingresa como materia prima reciclada en la cortina.'
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
