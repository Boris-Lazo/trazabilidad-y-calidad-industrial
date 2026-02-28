const ProcessContract = require('./ProcessContract');

class TelarContract extends ProcessContract {
    constructor() {
        super({
            processId: 2,
            nombre: 'Telares',
            nombreCorto: 'Telares',
            unidadProduccion: 'metros',
            descripcionProducto: 'tela circular de polipropileno tejida en telar circular',
            patronCodigoOrden: '2\\d{6}',
            origenesOrden: ['manual'],
            esInicioCadena: false,
            procesosAguasAbajo: [3],
            rolesOperativosPermitidos: [
                'Inspector de calidad',
                'Técnico operador',
                'Auxiliar de operaciones'
            ],
            restriccionesInicio: [
                'Telar sin orden activa asignada',
                'Rotura de cinta en urdimbre o trama',
                'Falla mecánica del telar',
                'Falta de materia prima (conos de cinta PP)',
                'Cambio de orden en proceso'
            ],
            maquinasPermitidas: [
                'T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07',
                'T-08', 'T-09', 'T-10', 'T-11', 'T-12', 'T-13'
            ],
            parametrosCalidad: [
                {
                    nombre: 'ancho',
                    etiqueta: 'Ancho de Tela',
                    unidad: 'pulgadas',
                    tolerancia: 0.25,
                    nominal: null,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica. El valor nominal se toma de la orden de producción activa en el telar.',
                    nota: 'La tolerancia es fija (±0.25 pulgadas) independientemente del ancho nominal.'
                },
                {
                    nombre: 'construccion_urdido',
                    etiqueta: 'Construcción — Hilos de Urdido',
                    unidad: 'hilos/pulgada',
                    nominal: null,
                    tolerancia: null,
                    critico: true,
                    calculado: false,
                    metodologia: 'El inspector cuenta manualmente los hilos de urdido por pulgada. El sistema muestra el valor nominal según la orden activa del telar.',
                    nota: 'Se registra el valor real medido. El sistema compara contra el nominal de la orden y determina cumple/no cumple.'
                },
                {
                    nombre: 'construccion_trama',
                    etiqueta: 'Construcción — Hilos de Trama',
                    unidad: 'hilos/pulgada',
                    nominal: null,
                    tolerancia: null,
                    critico: true,
                    calculado: false,
                    metodologia: 'El inspector cuenta manualmente los hilos de trama por pulgada. El sistema muestra el valor nominal según la orden activa del telar.',
                    nota: 'Se registra el valor real medido. El sistema compara contra el nominal de la orden y determina cumple/no cumple.'
                }
            ],
            parametrosInformativos: [
                {
                    nombre: 'acumulado_contador',
                    etiqueta: 'Acumulado Contador al cierre del tramo',
                    unidad: 'metros',
                    grupo: 'produccion_contador',
                    tipo: 'numerico_entero',
                    nota: 'Valor que muestra el contador físico del telar al momento del registro. La producción real se calcula como diferencia contra el registro anterior. No editable una vez cerrado el tramo.'
                },
                {
                    nombre: 'orden_activa',
                    etiqueta: 'Orden Activa',
                    unidad: '',
                    grupo: 'produccion_contador',
                    tipo: 'referencia_orden',
                    nota: 'Código de la orden de producción activa en el telar durante este tramo.'
                }
            ],
            frecuenciaMuestreo: {
                ancho: {
                    muestrasMinTurno: 4,
                    distribucion: [
                        { indice: 1, momento: 'hora_2_del_turno', descripcion: 'Primera medición — 2 horas después del inicio del turno' },
                        { indice: 2, momento: 'hora_4_del_turno', descripcion: 'Segunda medición — 4 horas después del inicio del turno' },
                        { indice: 3, momento: 'hora_6_del_turno', descripcion: 'Tercera medición — 6 horas después del inicio del turno' },
                        { indice: 4, momento: 'hora_8_del_turno', descripcion: 'Cuarta medición — al cierre del turno' }
                    ],
                    omisionRequiereMotivo: true,
                    permiteCopiarMuestraAnterior: false
                },
                construccion: {
                    muestrasMinTurno: 1,
                    distribucion: [
                        { indice: 1, momento: 'inicio_turno', descripcion: 'Única medición — al inicio del turno o al inicio de nueva orden' }
                    ],
                    omisionRequiereMotivo: true,
                    permiteCopiarMuestraAnterior: false
                }
            },
            version: '1.0.0',
            fechaCreacion: '2025-01-01',
            responsable: 'Sistema (Despliegue)',
            motivo: 'Contrato inicial completo para proceso de Telares. Define calidad de ancho (4 mediciones/turno), construcción (1 medición/turno), verificación de color por cambio de orden, defectos visuales lista cerrada, medición de producción por diferencia de contador acumulado, y reglas duras de asignación de personal por telar.'
        });

        // Campos específicos de telares
        this.totalMaquinas = 13;

        this.reglasAsignacionPersonal = {
            pareja: {
                maxMaquinas: 5
            },
            personaSola: {
                maxMaquinas: 3
            },
            nota: 'Una pareja cubre hasta 5 telares. Una persona sola cubre hasta 3 telares independientemente de su cargo. Dos personas separadas (no pareja) tienen cada una su propio límite de 3 telares. Esta regla es de validación dura: el sistema debe bloquear el guardado si se excede.'
        };

        this.reglasProduccion = {
            metodo: 'diferencia_acumulado_contador',
            descripcion: 'Cada telar tiene un contador acumulado de metros que se resetea el 1 de enero de cada año o en el momento más próximo al inicio del año antes de reanudar producción. El operario registra el valor acumulado del contador al final de su turno (o en el momento de cambio de orden). La producción del turno o del tramo de orden es la diferencia entre el acumulado registrado y el último acumulado registrado por el turno anterior (o por el tramo anterior de orden).',
            unidad: 'metros',
            resetAnual: true,
            resetCondicion: 'El contador no debe acumular metros del año anterior. El reset ocurre el 1 de enero o en el momento más cercano antes de reanudar operación.',
            registroPorCambioDeOrden: true,
            nota: 'Si el telar no operó (paro total del turno), el operario igualmente registra el acumulado actual (igual al del turno anterior, diferencia = 0) y debe seleccionar el tipo de paro y su justificación escrita.'
        };

        this.verificacionColor = {
            parametros: [
                {
                    nombre: 'color_urdido',
                    etiqueta: 'Color Urdido',
                    tipo: 'cumple_no_cumple',
                    referencia: 'orden'
                },
                {
                    nombre: 'color_trama',
                    etiqueta: 'Color Trama',
                    tipo: 'cumple_no_cumple',
                    referencia: 'orden'
                }
            ],
            frecuencia: 'por_cambio_de_orden_y_una_vez_por_turno',
            accionSiNoCumple: 'PARO_OBLIGATORIO',
            notaAccion: 'Si el color no cumple, el telar debe detenerse. El operario está obligado a corregir antes de reanudar. El no cumplimiento debe quedar registrado junto con el paro correspondiente.'
        };

        this.defectosVisuales = {
            listaFija: true,
            nota: 'Lista cerrada. Cada defecto se asocia a telar + orden + número de rollo. El número de rollo es autoincremental por telar con formato: {numero_rollo}-{codigo_telar} Ejemplo: 47-T-05. El operario escribe el número de rollo, el sistema lo valida.',
            tipos: [
                {
                    id: 'DEF-01',
                    nombre: 'Cintas incorrectas',
                    descripcion: 'Cintas fuera de especificación de denier, ancho o color insertadas en el tejido.'
                },
                {
                    id: 'DEF-02',
                    nombre: 'Tela picada',
                    descripcion: 'Tejido con roturas o agujeros visibles causados por rotura de cinta durante el proceso.'
                },
                {
                    id: 'DEF-03',
                    nombre: 'Rollo mal embobinado',
                    descripcion: 'Rollo con deformaciones, bordes irregulares o tensión inconsistente en el embobinado.'
                }
            ]
        };
    }
}

module.exports = TelarContract;
