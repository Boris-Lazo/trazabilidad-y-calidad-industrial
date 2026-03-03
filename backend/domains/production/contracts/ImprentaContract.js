const ProcessContract = require('./ProcessContract');

class ImprentaContract extends ProcessContract {
    constructor() {
        super({
            processId: 4,
            nombre: 'Imprenta',
            nombreCorto: 'Imprenta',
            unidadProduccion: 'impresiones',
            descripcionProducto: 'tela de polipropileno impresa con diseño del cliente según código de arte',
            patronCodigoOrden: '4\\d{6}',
            origenesOrden: ['manual'],
            esInicioCadena: false,
            procesosAguasAbajo: [5, 9],
            rolesOperativosPermitidos: [
                'Inspector de calidad',
                'Técnico operador',
                'Auxiliar de operaciones'
            ],
            restriccionesInicio: [
                'Sin rollos de entrada disponibles (Telares o Laminado)',
                'Falta de tinta',
                'Cambio de estilo/arte en proceso',
                'Falla mecánica de la impresora',
                'Temperatura o viscosidad de tinta fuera de rango'
            ],
            maquinasPermitidas: ['IMP-01'],
            // Nuevas secciones obligatorias
            descripcionProceso: {
                queHace: 'Impresión flexográfica de alta velocidad sobre tela de polipropileno (laminada o natural).',
                queTransforma: 'Rollos de tela neutra -> Rollos de tela impresa.',
                queRecibe: 'Rollos de tela de Telares o Laminado, tintas, solventes y clichés.',
                queEntrega: 'Rollos de tela impresa con diseño verificado y conteo de impresiones.'
            },
            tipoProceso: 'Por orden',
            metasProduccion: {
                metaEstandarTurno: 15000,
                supuestosOperativos: 'Velocidad de 100 m/min. Meta en impresiones totales por turno.',
                condicionesReduccionEficiencia: 'Montaje de clichés, limpieza de tinteros, ajuste de registro de color. El cambio de estilo reduce la eficiencia.'
            },
            unidadesReporte: {
                produccion: 'impresiones',
                merma: 'kg',
                reporteMultiUnidad: true
            },
            catalogoParos: {
                operativos: ['Cambio de clichés', 'Ajuste de viscosidad', 'Lavado de rodillos', 'Cambio de tono'],
                mecanicos: ['Falla sistema de secado', 'Rotura de piñón', 'Falla motor bobinador'],
                calidad: ['Mala adherencia', 'Fuera de registro', 'Manchas de tinta', 'Tono incorrecto'],
                externos: ['Falta de solvente', 'Falla eléctrica', 'Falta de tela base']
            },
            personalOperativo: {
                minimo: 2,
                maximo: 2,
                reglasEspeciales: '2 personas obligatorias.'
            },
            impactoVariabilidad: [
                { condicion: 'Viscosidad de tinta incorrecta', impacto: 'Provoca secado lento, repinte o pérdida de intensidad de color.' },
                { condicion: 'Desgaste de clichés', impacto: 'Genera imágenes borrosas y requiere paros para limpieza frecuente.' }
            ],
            parametrosCalidad: [
                {
                    nombre: 'ancho_tela',
                    etiqueta: 'Ancho de Tela',
                    unidad: 'pulgadas',
                    nominal: null,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica.',
                    notaFrontend: 'Ingresar valores en fracciones de 1/8 (ej: 12 1/8, 12 1/2).'
                },
                {
                    nombre: 'viscosidad_tinta',
                    etiqueta: 'Viscosidad de Tinta',
                    unidad: 'segundos (Copa Zahn #2)',
                    minimo: 19,
                    maximo: 25,
                    nominal: 22,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición con Copa Zahn #2. Se mide el tiempo de vaciado en segundos.',
                    nota: 'Se mide independientemente por cada tinta activa en la orden.'
                },
                {
                    nombre: 'adherencia_tinta',
                    etiqueta: 'Adherencia de Tinta',
                    unidad: 'booleano',
                    tipo: 'pasa_no_pasa',
                    critico: true,
                    calculado: false,
                    metodologia: 'Prueba manual de adherencia por tinta. Resultado: Pasa / No pasa.'
                }
            ],
            parametrosInformativos: [
                { nombre: 'velocidad_linea', etiqueta: 'Velocidad de Línea', unidad: 'm/min', grupo: 'maquina' },
                { nombre: 'tension_sustrato', etiqueta: 'Tensión del Sustrato', unidad: 'N', grupo: 'maquina' },
                {
                    nombre: 'codigo_rollo_activo',
                    etiqueta: 'Código de Rollo Activo',
                    tipo: 'texto',
                    grupo: 'produccion_rollo',
                    nota: 'Código del rollo que se está procesando.'
                },
                {
                    nombre: 'orden_activa',
                    etiqueta: 'Orden Activa',
                    tipo: 'referencia_orden',
                    grupo: 'produccion_rollo'
                }
            ],
            frecuenciaMuestreo: {
                muestrasMinTurno: 3,
                distribucion: [
                    { indice: 1, momento: 'inicio_turno', descripcion: 'Primera inspección' },
                    { indice: 2, momento: 'mitad_turno', descripcion: 'Segunda inspección' },
                    { indice: 3, momento: 'casi_cierre_turno', descripcion: 'Tercera inspección' }
                ],
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },
            version: '1.1.0',
            fechaCreacion: '2025-01-20',
            responsable: 'Arquitecto Industrial Jules',
            motivo: 'Contrato actualizado con las 9 secciones obligatorias para cumplimiento de arquitectura senior.'
        });

        this.totalMaquinas = 1;
        this.procesosAguasArriba = [2, 3];

        this.reglasProduccion = {
            metodo: 'conteo_impresiones',
            descripcion: 'La producción se mide en impresiones, no en metros. Cada impresión corresponde a un saco con las dimensiones definidas en la orden.',
            unidad: 'impresiones',
            registroPorRollo: true,
            registroPorCambioDeOrden: true
        };

        this.reglasRollosEntrada = {
            descripcion: 'Imprenta consume rollos que pueden provenir de Telares o Laminado.',
            origenesRollo: [
                { proceso_id: 2, nombre: 'Telares', formatoCodigo: 'R{3_digitos}-T{2_digitos}' },
                { proceso_id: 3, nombre: 'Laminado', formatoCodigo: 'R{3_digitos}-T{2_digitos}-L{3_digitos}' }
            ],
            registroIndividual: true
        };

        this.reglasTintas = {
            descripcion: 'Cada orden define los colores Pantone a imprimir. Hasta 8 colores: 5 frente y 3 dorso.',
            maximoColores: 8,
            camposPorTinta: [
                { nombre: 'posicion', opciones: ['frente', 'dorso'] },
                { nombre: 'codigo_pantone', tipo: 'texto' },
                { nombre: 'marca', tipo: 'texto libre' },
                { nombre: 'lote', tipo: 'texto libre' }
            ]
        };

        this.reglasDesperdicio = {
            unidad: 'kg',
            tipos: [
                { id: 'DESP-01', nombre: 'Desperdicio por cuadre' },
                { id: 'DESP-02', nombre: 'Desperdicio por defecto de entrada' }
            ],
            destinos: ['Peletizado', 'Descarte final'],
            registroObligatorio: true
        };
    }
}

module.exports = ImprentaContract;
