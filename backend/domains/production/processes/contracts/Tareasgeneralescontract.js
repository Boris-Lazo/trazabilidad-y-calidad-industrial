const ProcessContract = require('./ProcessContract');

class TareasGeneralesContract extends ProcessContract {
    constructor() {
        super({
            processId: 99,
            nombre: 'Tareas Generales',
            nombreCorto: 'TareasGen',
            unidadProduccion: 'hrs',
            descripcionProducto: 'Actividades de soporte, mantenimiento, limpieza y apoyo entre procesos productivos.',
            patronCodigoOrden: 'TG\\d+|EM-\\d+',
            origenesOrden: ['manual'],
            maquinasPermitidas: [],
            esInicioCadena: false,
            procesosAguasAbajo: [],
            restriccionesInicio: [],
            descripcionProceso: {
                queHace: 'Gestión de personal sobrante o en apoyo: limpieza, mantenimiento menor, apoyo a otros procesos y tareas administrativas de planta.',
                queTransforma: 'Tiempo de personal disponible → actividades de valor para la planta.',
                queRecibe: 'Personal asignado sin turno productivo fijo ese día.',
                queEntrega: 'Registro de actividad del colaborador durante el turno.'
            },
            tipoProceso: 'Soporte',
            metasProduccion: {
                metaEstandarTurno: 0,
                supuestosOperativos: 'No aplica meta de producción. Se registra la actividad realizada.',
                condicionesReduccionEficiencia: 'N/A'
            },
            unidadesReporte: {
                produccion: 'hrs',
                merma: null,
                reporteMultiUnidad: false
            },
            catalogoParos: {
                operativos: [],
                mecanicos: [],
                calidad: [],
                externos: []
            },
            personalOperativo: {
                minimo: 1,
                maximo: 99,
                reglasEspeciales: 'Personal variable según disponibilidad.'
            },
            impactoVariabilidad: [],
            parametrosCalidad: [],
            parametrosInformativos: [],
            frecuenciaMuestreo: {
                registrosFormalsPorTurno: 0,
                distribucion: [],
                omisionRequiereMotivo: false,
                permiteCopiarMuestraAnterior: false
            },
            version: '1.0.0',
            fechaCreacion: '2025-01-01',
            responsable: 'Administración',
            motivo: 'Proceso de soporte para asignación de personal en turnos sin producción asignada.'
        });
    }
}

module.exports = TareasGeneralesContract;