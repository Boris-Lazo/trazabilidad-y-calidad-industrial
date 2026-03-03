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
            // Nuevas secciones obligatorias
            descripcionProceso: {
                queHace: 'Corte automático de tela circular y costura de fondo para formar el saco industrial.',
                queTransforma: 'Rollos de tela (impresa o natural) -> Sacos individuales costurados.',
                queRecibe: 'Rollos de tela de Imprenta, Laminado o Telares, hilo de costura.',
                queEntrega: 'Paquetes de sacos contados y amarrados, listos para despacho o enfardado.'
            },
            tipoProceso: 'Por orden',
            metasProduccion: {
                metaEstandarTurno: 9000,
                supuestosOperativos: 'Velocidad de 35 sacos/min. Meta estándar por turno.',
                condicionesReduccionEficiencia: 'Medidas > 40 pulgadas reducen eficiencia. Cambios de bobina de hilo, ajuste de cuchillas de corte, fallas en sistema de transporte.'
            },
            unidadesReporte: {
                produccion: 'unidades',
                merma: 'kg',
                reporteMultiUnidad: true
            },
            catalogoParos: {
                operativos: ['Cambio de rollo', 'Enhebrado de hilo', 'Ajuste de largo de corte', 'Limpieza de área'],
                mecanicos: ['Falla servomotor', 'Desajuste de cuchilla', 'Falla fotocelda de registro', 'Falla cabezal de costura'],
                calidad: ['Largo fuera de tolerancia', 'Costura abierta', 'Corte desalineado', 'Mal doblez'],
                externos: ['Falta de hilo', 'Falla eléctrica', 'Falta de tela impresa']
            },
            personalOperativo: {
                minimo: 1,
                maximo: 1,
                reglasEspeciales: '1 persona dedicada.'
            },
            impactoVariabilidad: [
                { condicion: 'Tela mal embobinada', impacto: 'Causa paros frecuentes por desalineación en la entrada de la convertidora.' },
                { condicion: 'Variación en el largo de impresión', impacto: 'Dificulta el registro de corte y genera desperdicio por sacos mal cortados.' }
            ],
            parametrosCalidad: [
                {
                    nombre: 'ancho_saco',
                    etiqueta: 'Ancho del Saco',
                    unidad: 'pulgadas',
                    nominal: null,
                    tolerancia: 0.25,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica.',
                    notaFrontend: 'Ingresar valores en fracciones de 1/8 (ej: 12 1/8, 12 1/2).'
                },
                {
                    nombre: 'largo_saco',
                    etiqueta: 'Largo del Saco',
                    unidad: 'pulgadas',
                    nominal: null,
                    tolerancia: 0.25,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica.',
                    notaFrontend: 'Ingresar valores en fracciones de 1/8 (ej: 12 1/8, 12 1/2).'
                },
                {
                    nombre: 'doble_costura',
                    etiqueta: 'Doble de Costura del Fondo',
                    unidad: 'pulgadas',
                    nominal: null,
                    tolerancia: 0.125,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física del doblez del fondo costurado.',
                    notaFrontend: 'Ingresar valores en fracciones de 1/8 (ej: 12 1/8, 12 1/2).'
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
                    metodologia: 'Conteo manual de puntadas.'
                }
            ],
            frecuenciaMuestreo: {
                muestrasMinTurno: 4,
                distribucion: [
                    { indice: 1, momento: 'primera_inspeccion', descripcion: 'Primera inspección' },
                    { indice: 2, momento: 'segunda_inspeccion', descripcion: 'Segunda inspección' },
                    { indice: 3, momento: 'tercera_inspeccion', descripcion: 'Tercera inspección' },
                    { indice: 4, momento: 'cuarta_inspeccion', descripcion: 'Cuarta inspección' }
                ],
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },
            version: '1.1.0',
            fechaCreacion: '2025-01-20',
            responsable: 'Arquitecto Industrial Jules',
            motivo: 'Contrato actualizado con las 9 secciones obligatorias para cumplimiento de arquitectura senior.'
        });

        this.totalMaquinas = 3;
        this.procesosAguasArriba = [4];

        this.reglasProduccion = {
            metodo: 'conteo_unidades',
            descripcion: 'La producción se cuenta en sacos terminados.',
            unidad: 'unidades',
            registroPorRollo: true,
            registroPorCambioDeOrden: true
        };

        this.reglasRollosEntrada = {
            descripcion: 'Conversión consume rollos impresos del proceso 4.',
            origenProceso: 4,
            formatoCodigo: 'R{3_digitos}-T{2_digitos}-L{3_digitos}'
        };

        this.reglasDesperdicio = {
            unidad: 'kg',
            destinos: ['Peletizado', 'Descarte final'],
            registroObligatorio: true
        };
    }
}

module.exports = ConversionSacosContract;
