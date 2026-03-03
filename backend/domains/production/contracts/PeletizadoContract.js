const ProcessContract = require('./ProcessContract');

class PeletizadoContract extends ProcessContract {
    constructor() {
        super({
            processId: 8,
            nombre: 'Peletizado',
            nombreCorto: 'Peletizado',
            unidadProduccion: 'kg',
            descripcionProducto: 'Pellets de polipropileno reciclado producidos a partir del desperdicio de procesos PP.',
            patronCodigoOrden: '8\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            maquinasPermitidas: ['PELET'],
            esInicioCadena: false,
            procesosAguasAbajo: [],
            restriccionesInicio: [
                'Sin material de desperdicio disponible',
                'Máquina en mantenimiento',
                'Temperatura fuera de rango al arranque'
            ],
            // Nuevas secciones obligatorias
            descripcionProceso: {
                queHace: 'Recuperación de desperdicios plásticos de procesos anteriores mediante fundido, filtrado y corte en pellets.',
                queTransforma: 'Mermas y retazos plásticos (PP) -> Pellets de material reciclado.',
                queRecibe: 'Mermas de Extrusión PP, Telares, Laminado, Imprenta y Conversión.',
                queEntrega: 'Sacos de pellet reciclado listos para reincorporarse a la producción.'
            },
            tipoProceso: 'Por lotes',
            metasProduccion: {
                metaEstandarTurno: 250,
                supuestosOperativos: 'Operación continua a 190 kg/h. Meta en kg de pellet recuperado.',
                condicionesReduccionEficiencia: 'Material puro de cortina de laminado reduce eficiencia 40%. Material de entrada muy contaminado, saturación de filtros de malla, fallas en el sistema de corte sumergido.'
            },
            unidadesReporte: {
                produccion: 'kg',
                merma: 'kg',
                reporteMultiUnidad: false
            },
            catalogoParos: {
                operativos: ['Carga de tolva', 'Limpieza de filtros', 'Cambio de cuchillas', 'Ajuste de temperatura'],
                mecanicos: ['Falla motor principal', 'Obstrucción de husillo', 'Falla sistema de enfriamiento'],
                calidad: ['Pellet deforme', 'Presencia de contaminantes', 'Color fuera de estándar'],
                externos: ['Falta de material para procesar', 'Falla eléctrica']
            },
            personalOperativo: {
                minimo: 1,
                maximo: 1,
                reglasEspeciales: '1 persona.'
            },
            impactoVariabilidad: [
                { condicion: 'Mezcla de materiales (PP con PE)', impacto: 'Inestabilidad en el extruido y pellets de mala calidad mecánica.' },
                { condicion: 'Humedad en el desperdicio', impacto: 'Genera porosidad en el pellet y reduce su valor de reutilización.' }
            ],
            parametrosCalidad: [
                {
                    nombre: 'color_pelet',
                    etiqueta: 'Color del Pelet',
                    unidad: null,
                    tipo: 'texto_libre',
                    critico: false,
                    calculado: false,
                    metodologia: 'Inspección visual del color del pelet de salida.'
                },
                {
                    nombre: 'tipo_material',
                    etiqueta: 'Tipo de Material Procesado',
                    unidad: null,
                    tipo: 'texto_libre',
                    critico: false,
                    calculado: false,
                    metodologia: 'Descripción del tipo de desperdicio procesado.'
                }
            ],
            parametrosInformativos: [],
            frecuenciaMuestreo: {
                registrosFormalsPorTurno: 2,
                distribucion: [
                    { indice: 1, momento: 'inicio_turno', descripcion: 'Inspección inicial' },
                    { indice: 2, momento: 'cierre_turno', descripcion: 'Inspección final' }
                ],
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },
            version: '1.1.0',
            fechaCreacion: '2025-01-20',
            responsable: 'Arquitecto Industrial Jules',
            motivo: 'Contrato actualizado con las 9 secciones obligatorias para cumplimiento de arquitectura senior.'
        });

        this.procesosAguasAbajo = [1, 3];
    }
}

module.exports = PeletizadoContract;
