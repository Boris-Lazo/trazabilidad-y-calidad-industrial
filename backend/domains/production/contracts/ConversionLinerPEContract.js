const ProcessContract = require('./ProcessContract');

class ConversionLinerPEContract extends ProcessContract {
    constructor() {
        super({
            processId: 7,
            nombre: 'Conversión de Liner PE',
            nombreCorto: 'Conv. Liner PE',
            unidadProduccion: 'unidades',
            descripcionProducto: 'Liners de polietileno: manga tubular cortada a ' +
                                 'longitud nominal y sellada en un extremo',
            patronCodigoOrden: '7\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            maquinasPermitidas: ['CONV-LI-01'],
            esInicioCadena: false,
            procesosAguasAbajo: [],
            restriccionesInicio: [
                'Sin rollos de manga PE disponibles',
                'Falla en sistema de sellado',
                'Temperatura de sellado fuera de rango',
                'Orden sin dimensiones definidas (ancho o largo)'
            ],

            // ─────────────────────────────────────────────
            // PARÁMETROS DE CALIDAD
            // 4 registros formales por turno.
            // ─────────────────────────────────────────────
            parametrosCalidad: [
                {
                    nombre: 'ancho_liner',
                    etiqueta: 'Ancho del Liner',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: {
                        tipo: 'simetrica',
                        valor: 0.25,
                        unidad: 'pulgadas',
                        descripcion: '±¼"'
                    },
                    critico: false,
                    calculado: false,
                    validacion: 'rango_vs_nominal',
                    nota: 'El ancho nominal coincide con el ancho de burbuja del ' +
                          'rollo de manga PE consumido. Se verifica contra la orden.',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5", no 12 4/8"). ' +
                                  'Valores válidos: 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8. ' +
                                  'Nunca decimales.'
                },
                {
                    nombre: 'largo_liner',
                    etiqueta: 'Largo del Liner',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: {
                        tipo: 'simetrica',
                        valor: 0.25,
                        unidad: 'pulgadas',
                        descripcion: '±¼"'
                    },
                    critico: false,
                    calculado: false,
                    validacion: 'rango_vs_nominal',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5", no 12 4/8"). ' +
                                  'Valores válidos: 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8. ' +
                                  'Nunca decimales.'
                },
                {
                    nombre: 'sello_fondo',
                    etiqueta: 'Sello de Fondo',
                    unidad: null,
                    tipo: 'cumple_no_cumple',
                    nominal: 'Cumple',
                    critico: true,
                    calculado: false,
                    validacion: 'inspeccion_visual',
                    metodologia: 'Inspección visual del sello en el extremo cortado. ' +
                                 'Verificar que el sellado sea continuo, sin fugas ni ' +
                                 'despegues.'
                }
            ],

            // ─────────────────────────────────────────────
            // PARÁMETROS OPERATIVOS — una vez por turno
            // ─────────────────────────────────────────────
            parametrosInformativos: [
                {
                    nombre: 'temperatura_sellado',
                    etiqueta: 'Temperatura de Sellado',
                    unidad: '°C',
                    grupo: 'maquina',
                    obligatorio: true,
                    frecuencia: 'una_vez_por_turno'
                },
                {
                    nombre: 'velocidad_operacion',
                    etiqueta: 'Velocidad de Operación',
                    unidad: 'unidades/min',
                    grupo: 'maquina',
                    obligatorio: true,
                    frecuencia: 'una_vez_por_turno'
                }
            ],

            // ─────────────────────────────────────────────
            // FRECUENCIA DE MUESTREO
            // ─────────────────────────────────────────────
            frecuenciaMuestreo: {
                registrosFormalsPorTurno: 4,
                descripcion: '4 registros formales de calidad por turno. ' +
                             'El inspector puede tomar más muestras físicas, ' +
                             'pero solo se registran 4 en el sistema.',
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },

            motivo: 'Contrato inicial completo para proceso de Conversión de Liner PE. ' +
                    'Define 1 máquina (CONV-LI-01), producción por contador de unidades, ' +
                    '3 parámetros de calidad (ancho ±¼", largo ±¼", sello de fondo), ' +
                    '2 parámetros operativos (temperatura de sellado y velocidad), ' +
                    'consumo de rollos del Extrusor PE por código de lote, y generación ' +
                    'de lote propio con correlativo que reinicia por orden.'
        });

        // procesosAguasArriba no está en la clase base ProcessContract.
        // Se asigna directamente en la instancia para mantener consistencia
        // con el patrón usado en TelarContract y LaminadoContract.
        this.procesosAguasArriba = [6];

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE PRODUCCIÓN
        // ─────────────────────────────────────────────────────────────────
        this.reglasProduccion = {
            modalidad: 'contador_unidades',
            descripcion: 'La producción se registra como total de liners producidos ' +
                         'en el turno. Se cuenta en unidades individuales. Los liners ' +
                         'se empaquetan físicamente de 500 unidades, pero el sistema ' +
                         'registra unidades sueltas.',
            notaEmpaque: 'El empaque en paquetes de 500 es logístico, no es ' +
                         'relevante para el registro de producción en el sistema.'
        };

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE CONSUMO DE ROLLOS (proceso aguas arriba: Extrusor PE)
        // El operario declara los rollos de manga PE consumidos en el turno
        // usando el código de lote exacto del proceso 6.
        // ─────────────────────────────────────────────────────────────────
        this.reglasConsumoLote = {
            descripcion: 'La convertidora de liner debe declarar los rollos de ' +
                         'manga PE del Extrusor PE (proceso 6) consumidos en el turno.',
            origen: 'Extrusor PE (proceso 6)',
            codigoRollo: 'Se usa el código de lote exacto tal como viene físicamente ' +
                         'en el rollo, sin modificaciones. ' +
                         'Formato: {codigo_orden}-EXTPE{NN}-{correlativo_3_digitos}. ' +
                         'Ejemplo: 6000123-EXTPE01-001.',
            obligatoriedad: 'Al menos un rollo debe ser declarado por cada turno ' +
                            'con producción > 0.',
            multiplicidad: 'Puede consumir múltiples rollos en un mismo turno ' +
                           'si la orden requiere más material del que cabe en uno.',
            estadosPermitidos: ['activo', 'pausado'],
            restriccion: 'No se pueden declarar rollos con lote en estado cerrado.',
            cantidadConsumida: 'No se registra cantidad consumida por rollo, ' +
                               'solo la referencia al código de lote.'
        };

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE LOTE PROPIO
        // Código: {codigo_orden}-{correlativo_3_digitos}
        // El correlativo reinicia al cambiar de orden.
        // ─────────────────────────────────────────────────────────────────
        this.reglasLote = {
            generacion: 'automatica',
            descripcion: 'Se genera un lote por cada turno de producción registrado. ' +
                         'El correlativo reinicia a 001 al cambiar de orden.',
            codigoFormato: '{codigo_orden}-{correlativo_3_digitos}',
            codigoEjemplo: '7000123-001',
            componentesFormato: {
                codigo_orden: '7 dígitos de la orden (ej: 7000123)',
                correlativo:  '3 dígitos con cero a la izquierda (001, 002...)'
            },
            correlativo: {
                alcance: 'por_orden',
                reinicia: 'al_cambiar_orden',
                descripcion: 'El correlativo cuenta los lotes generados por esa orden ' +
                             'en la convertidora. Al asignarse una nueva orden, el ' +
                             'correlativo vuelve a 001.',
                formato: '3 dígitos con cero a la izquierda'
            },
            estadosLote: ['activo', 'pausado', 'cerrado'],
            responsableGeneracion: 'sistema',
            momentoGeneracion: 'al guardar producción del turno'
        };

        // ─────────────────────────────────────────────────────────────────
        // REGLAS DE ESPECIFICACIONES DE ORDEN
        // Campos obligatorios antes de permitir producción.
        // ─────────────────────────────────────────────────────────────────
        this.reglasEspecificacionesOrden = {
            camposObligatoriosAntesDePRoducir: [
                {
                    campo: 'ancho_nominal',
                    etiqueta: 'Ancho Nominal (pulgadas)',
                    nota: 'Viene de SAP. Campo bloqueante: no se puede registrar ' +
                          'producción sin él.',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5", no 12 4/8"). ' +
                                  'Valores válidos: 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8. ' +
                                  'Nunca decimales.'
                },
                {
                    campo: 'largo_nominal',
                    etiqueta: 'Largo Nominal (pulgadas)',
                    nota: 'Viene de SAP. Campo bloqueante: no se puede registrar ' +
                          'producción sin él.',
                    notaFrontend: 'Pulgadas en fracciones simplificadas de 1/8. ' +
                                  'Ej: 12 1/2" (no 12.5", no 12 4/8"). ' +
                                  'Valores válidos: 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8. ' +
                                  'Nunca decimales.'
                },
                {
                    campo: 'microperforado',
                    etiqueta: 'Microperforado (Sí/No)',
                    nota: 'Viene de SAP. Si no está definido, el sistema debe ' +
                          'solicitarlo explícitamente. Campo bloqueante.',
                    notaParser: 'El parser SAP del proceso 7 extrae microperforado ' +
                                'del campo de descripción del producto. Verificar que ' +
                                'el valor esté presente antes de confirmar la importación.'
                },
                {
                    campo: 'color',
                    etiqueta: 'Color',
                    nota: 'Viene de SAP. El parser busca en lista cerrada de colores ' +
                          'conocidos. Si no encuentra coincidencia, asigna TRANSPARENTE ' +
                          'por defecto. Confirmar en importación.',
                    notaParser: 'Default: TRANSPARENTE si el color no se reconoce ' +
                                'en el texto de la descripción SAP.'
                }
            ]
        };
    }
}

module.exports = ConversionLinerPEContract;
