const ProcessContract = require('./ProcessContract');

class ConversionSacosVestidosContract extends ProcessContract {
    constructor() {
        super({
            processId: 9,
            nombre: 'Conversión de Sacos Vestidos',
            nombreCorto: 'Conv. Sacos Vestidos',
            unidadProduccion: 'unidades',
            descripcionProducto: 'Sacos de polipropileno con liner de polietileno insertado — corte, costura de fondo y vestido en un solo proceso',
            patronCodigoOrden: '9\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            maquinasPermitidas: ['CONV#03'],
            esInicioCadena: false,
            procesosAguasAbajo: [],
            restriccionesInicio: [
                'Sin rollos de tela/laminado/impreso disponibles',
                'Sin rollos de manga PE disponibles',
                'Orden con con_fuelle = true (máquina no puede procesar sacos con fuelle)',
                'Orden con microperforado = true (máquina no puede perforar)',
                'Orden sin dimensiones definidas (ancho, largo o ancho_liner)'
            ],
            // Nuevas secciones obligatorias
            descripcionProceso: {
                queHace: 'Proceso integral de corte de tela, formación de liner PE, inserción (vestido) y costura de fondo en una sola operación.',
                queTransforma: 'Rollos de tela + Rollos de película PE -> Sacos vestidos (con liner interno).',
                queRecibe: 'Rollos de tela (impresa/laminada), rollos de manga PE, hilo de costura.',
                queEntrega: 'Sacos terminados con liner insertado y costurado, amarrados en paquetes.'
            },
            tipoProceso: 'Por orden',
            metasProduccion: {
                metaEstandarTurno: 10000,
                supuestosOperativos: 'Velocidad de 22 sacos/min. Meta en unidades terminadas.',
                condicionesReduccionEficiencia: 'Sincronización de corte de tela y liner, fallas en el sistema de inserción por aire, cambios de rollos dobles.'
            },
            unidadesReporte: {
                produccion: 'unidades',
                merma: 'kg',
                reporteMultiUnidad: true
            },
            catalogoParos: {
                operativos: ['Cambio de rollo tela', 'Cambio de rollo PE', 'Ajuste de inserción', 'Limpieza general'],
                mecanicos: ['Falla barra selladora liner', 'Falla sistema neumático inserción', 'Desajuste de cuchillas dobles'],
                calidad: ['Liner mal posicionado', 'Sello de liner abierto', 'Saco mal cortado', 'Costura defectuosa'],
                externos: ['Falta de película PE', 'Falta de tela base', 'Falla eléctrica']
            },
            personalOperativo: {
                minimo: 2,
                maximo: 3,
                reglasEspeciales: 'Requiere un operador especializado en la sincronización tela-liner y un auxiliar de empaque.'
            },
            impactoVariabilidad: [
                { condicion: 'Diferencia de estática entre tela y PE', impacto: 'Dificulta la inserción del liner y provoca atascos en la zona de costura.' },
                { condicion: 'Variación de ancho en manga PE', impacto: 'Causa liners arrugados o bloqueos en el embudo de inserción.' }
            ],
            parametrosCalidad: [
                {
                    nombre: 'ancho_saco',
                    etiqueta: 'Ancho del Saco',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: 0.25,
                    critico: false,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica.'
                },
                {
                    nombre: 'largo_saco',
                    etiqueta: 'Largo del Saco',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: 0.25,
                    critico: false,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica.'
                },
                {
                    nombre: 'doble_costura',
                    etiqueta: 'Doblez de Fondo (doble costura)',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: 0.125,
                    critico: false,
                    calculado: false,
                    metodologia: 'Medición física del doblez.'
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
                    metodologia: 'Contar puntadas en 10 cm.'
                },
                {
                    nombre: 'sello_liner',
                    etiqueta: 'Sello del Liner',
                    unidad: null,
                    tipo: 'cumple_no_cumple',
                    nominal: 'Cumple',
                    critico: true,
                    calculado: false,
                    metodologia: 'Inspección visual del liner insertado.'
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

        this.procesosAguasArriba = [2, 3, 4, 6];

        this.reglasProduccion = {
            metodo: 'conteo_unidades',
            unidad: 'unidades'
        };

        this.reglasRollosEntrada = {
            descripcion: 'Consume material de saco y manga PE simultáneamente.'
        };
    }
}

module.exports = ConversionSacosVestidosContract;
