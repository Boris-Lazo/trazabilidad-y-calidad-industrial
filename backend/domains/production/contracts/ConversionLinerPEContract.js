const ProcessContract = require('./ProcessContract');

class ConversionLinerPEContract extends ProcessContract {
    constructor() {
        super({
            processId: 7,
            nombre: 'Conversión de Liner PE',
            nombreCorto: 'Conv. Liner PE',
            unidadProduccion: 'unidades',
            descripcionProducto: 'Liners de polietileno: manga tubular cortada a longitud nominal y sellada en un extremo',
            patronCodigoOrden: '7\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            maquinasPermitidas: ['CONV-LI'],
            esInicioCadena: false,
            procesosAguasAbajo: [],
            restriccionesInicio: [
                'Sin rollos de manga PE disponibles',
                'Falla en sistema de sellado',
                'Temperatura de sellado fuera de rango',
                'Orden sin dimensiones definidas (ancho o largo)'
            ],
            // Nuevas secciones obligatorias
            descripcionProceso: {
                queHace: 'Corte y sellado térmico de fondo de película tubular de polietileno para crear bolsas (liners) internas.',
                queTransforma: 'Rollos de película tubular PE -> Bolsas (liners) individuales.',
                queRecibe: 'Rollos de manga de polietileno de Extrusión PE.',
                queEntrega: 'Paquetes de liners sellados y contados para inserción en sacos.'
            },
            tipoProceso: 'Por orden',
            metasProduccion: {
                metaEstandarTurno: 12000,
                supuestosOperativos: 'Velocidad de 25 unidades/min. Meta en unidades terminadas.',
                condicionesReduccionEficiencia: 'Ajustes de temperatura de sellado, fallas en la barra soldadora, mala calidad de la película base.'
            },
            unidadesReporte: {
                produccion: 'unidades',
                merma: 'kg',
                reporteMultiUnidad: true
            },
            catalogoParos: {
                operativos: ['Cambio de rollo PE', 'Ajuste de largo', 'Limpieza de barra selladora', 'Cambio de teflón'],
                mecanicos: ['Falla resistencia sellado', 'Falla fotocelda', 'Falla neumática de corte'],
                calidad: ['Sello débil o con fugas', 'Largo fuera de rango', 'Sello quemado'],
                externos: ['Falta de película PE', 'Falla eléctrica']
            },
            personalOperativo: {
                minimo: 1,
                maximo: 1,
                reglasEspeciales: 'Un solo operador para alimentación y retiro de paquetes.'
            },
            impactoVariabilidad: [
                { condicion: 'Variación de espesor en película', impacto: 'Causa sellados irregulares o quemados, requiriendo ajuste constante de temperatura.' },
                { condicion: 'Electricidad estática alta', impacto: 'Dificulta la apertura y el conteo de los liners, reduciendo la velocidad de empaque.' }
            ],
            parametrosCalidad: [
                {
                    nombre: 'ancho_liner',
                    etiqueta: 'Ancho del Liner',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: 0.25,
                    critico: false,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica.',
                    notaFrontend: 'Ingresar valores en fracciones de 1/8 (ej: 12 1/8, 12 1/2).'
                },
                {
                    nombre: 'largo_liner',
                    etiqueta: 'Largo del Liner',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: 0.25,
                    critico: false,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica.',
                    notaFrontend: 'Ingresar valores en fracciones de 1/8 (ej: 12 1/8, 12 1/2).'
                },
                {
                    nombre: 'sello_fondo',
                    etiqueta: 'Sello de Fondo',
                    unidad: null,
                    tipo: 'cumple_no_cumple',
                    nominal: 'Cumple',
                    critico: true,
                    calculado: false,
                    metodologia: 'Inspección visual y prueba de estanqueidad manual.'
                }
            ],
            parametrosInformativos: [
                {
                    nombre: 'temperatura_sellado',
                    etiqueta: 'Temperatura de Sellado',
                    unidad: '°C',
                    grupo: 'maquina'
                },
                {
                    nombre: 'velocidad_operacion',
                    etiqueta: 'Velocidad de Operación',
                    unidad: 'unidades/min',
                    grupo: 'maquina'
                }
            ],
            frecuenciaMuestreo: {
                registrosFormalsPorTurno: 4,
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },
            version: '1.1.0',
            fechaCreacion: '2025-01-20',
            responsable: 'Arquitecto Industrial Jules',
            motivo: 'Contrato actualizado con las 9 secciones obligatorias para cumplimiento de arquitectura senior.'
        });

        this.procesosAguasArriba = [6];

        this.reglasProduccion = {
            modalidad: 'contador_unidades',
            unidad: 'unidades'
        };

        this.reglasLote = {
            generacion: 'automatica',
            codigoFormato: '{codigo_orden}-{correlativo_3_digitos}',
            estadosLote: ['activo', 'pausado', 'cerrado']
        };
    }
}

module.exports = ConversionLinerPEContract;
