/**
 * Interfaz base para contratos de procesos productivos.
 * Define el comportamiento estático y reglas de validación para cada proceso.
 * Implementación inmutable y auditada por código.
 */
const AppError = require('../../../shared/errors/AppError');

class ProcessContract {
    constructor(data) {
        if (this.constructor === ProcessContract) {
            throw new AppError("No se puede instanciar la clase abstracta ProcessContract.", 500);
        }

        const {
            processId,
            nombre,
            unidadProduccion,
            area = 'Producción',
            estado = 'Activo',
            fechaCreacion,
            responsable = 'Sistema (Despliegue)',
            version = '1.0.0',
            motivo = 'Definición inicial del proceso industrial',
            tiposOrdenPermitidos = [],
            maquinasPermitidas = [],
            rolesOperativosPermitidos = ['Inspector de calidad', 'Técnico operador', 'Auxiliar de operaciones'],
            metricasObligatorias = [],
            historial = []
        } = data;

        this.processId = processId;
        this.nombre = nombre;
        this.unidadProduccion = unidadProduccion;
        this.area = area;
        this.estado = estado;
        this.fechaCreacion = fechaCreacion || '2024-01-01';
        this.responsable = responsable;
        this.version = version;
        this.motivo = motivo;
        this.tiposOrdenPermitidos = tiposOrdenPermitidos;
        this.maquinasPermitidas = maquinasPermitidas;
        this.rolesOperativosPermitidos = rolesOperativosPermitidos;
        this.metricasObligatorias = metricasObligatorias;

        // Nuevos campos del contrato
        this.nombreCorto = data.nombreCorto || this.nombre;
        this.descripcionProducto = data.descripcionProducto || '';
        this.patronCodigoOrden = data.patronCodigoOrden || null;
        this.origenesOrden = data.origenesOrden || ['manual'];
        this.restriccionesInicio = data.restriccionesInicio || [];
        this.parametrosCalidad = data.parametrosCalidad || [];
        this.parametrosInformativos = data.parametrosInformativos || [];
        this.frecuenciaMuestreo = data.frecuenciaMuestreo || null;
        this.procesosAguasAbajo = data.procesosAguasAbajo || data['procesosAguas abajo'] || [];
        this.esInicioCadena = data.esInicioCadena || data.esInicioCADena || false;
        this.turnosPermitidos = data.turnosPermitidos || [1, 2, 3];
        this.origenOperario = 'modulo_planificacion';

        // Estructura obligatoria del Contrato Técnico de Proceso (Senior Architect Requirement)
        this.descripcionProceso = data.descripcionProceso || {
            queHace: '',
            queTransforma: '',
            queRecibe: '',
            queEntrega: ''
        };
        this.tipoProceso = data.tipoProceso || 'Por orden'; // Continuo / Por lotes / Por orden / Mixto
        this.metasProduccion = data.metasProduccion || {
            metaEstandarTurno: null,
            supuestosOperativos: '',
            condicionesReduccionEficiencia: ''
        };
        this.unidadesReporte = data.unidadesReporte || {
            produccion: this.unidadProduccion,
            merma: 'kg',
            reporteMultiUnidad: false
        };
        this.catalogoParos = data.catalogoParos || {
            operativos: [],
            mecanicos: [],
            calidad: [],
            externos: []
        };
        this.personalOperativo = data.personalOperativo || {
            minimo: 1,
            maximo: 2,
            reglasEspeciales: ''
        };
        this.impactoVariabilidad = data.impactoVariabilidad || [];

        // Historial inmutable de versiones
        this.historial = historial.length > 0 ? historial : [{
            version,
            fecha: this.fechaCreacion,
            responsable,
            motivo
        }];
    }

    /**
     * Valida si la unidad de medida proporcionada es correcta para este proceso.
     * @param {string} unidad
     * @returns {boolean}
     */
    validaUnidad(unidad) {
        return unidad === this.unidadProduccion;
    }

    /**
     * Retorna la lista de parámetros técnicos obligatorios para este proceso.
     * @returns {string[]}
     */
    parametrosObligatorios() {
        return this.metricasObligatorias.map(m => m.nombre);
    }

    /**
     * Valida un parámetro específico según las reglas del contrato.
     * @param {string} nombre
     * @param {any} valor
     * @returns {{valido: boolean, error?: string}}
     */
    validarParametro(nombre, valor) {
        const metrica = this.metricasObligatorias.find(m => m.nombre === nombre);
        if (metrica && (valor === null || valor === undefined || valor === '')) {
            return { valido: false, error: `${nombre} es obligatorio para el proceso ${this.nombre}` };
        }
        return { valido: true };
    }

    /**
     * Serializa el contrato para su exposición en API.
     */
    toJSON() {
        return {
            processId: this.processId,
            nombre: this.nombre,
            unidadProduccion: this.unidadProduccion,
            area: this.area,
            estado: this.estado,
            fechaCreacion: this.fechaCreacion,
            responsable: this.responsable,
            version: this.version,
            motivo: this.motivo,
            tiposOrdenPermitidos: this.tiposOrdenPermitidos,
            maquinasPermitidas: this.maquinasPermitidas,
            rolesOperativosPermitidos: this.rolesOperativosPermitidos,
            metricasObligatorias: this.metricasObligatorias,
            nombreCorto: this.nombreCorto,
            descripcionProducto: this.descripcionProducto,
            patronCodigoOrden: this.patronCodigoOrden,
            origenesOrden: this.origenesOrden,
            restriccionesInicio: this.restriccionesInicio,
            parametrosCalidad: this.parametrosCalidad,
            parametrosInformativos: this.parametrosInformativos,
            frecuenciaMuestreo: this.frecuenciaMuestreo,
            procesosAguasAbajo: this.procesosAguasAbajo,
            esInicioCadena: this.esInicioCadena,
            turnosPermitidos: this.turnosPermitidos,
            origenOperario: this.origenOperario,
            descripcionProceso: this.descripcionProceso,
            tipoProceso: this.tipoProceso,
            metasProduccion: this.metasProduccion,
            unidadesReporte: this.unidadesReporte,
            catalogoParos: this.catalogoParos,
            personalOperativo: this.personalOperativo,
            impactoVariabilidad: this.impactoVariabilidad,
            historial: this.historial
        };
    }
}

module.exports = ProcessContract;
