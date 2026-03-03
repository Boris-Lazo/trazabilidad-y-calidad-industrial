const ProcessContract = require('./ProcessContract');

class ExtrusionPEContract extends ProcessContract {
    constructor() {
        super({
            processId: 6,
            nombre: 'Extrusión de Polietileno',
            nombreCorto: 'Extrusor PE',
            unidadProduccion: 'kg',
            descripcionProducto: 'Bobinas de película tubular (manga de PE) para liner de sacos',
            patronCodigoOrden: '6\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            maquinasPermitidas: ['EXTPE01', 'EXTPE02'],
            esInicioCadena: true,
            procesosAguasAbajo: [7, 9],
            restriccionesInicio: [
                'Máquina en mantenimiento',
                'Falta de materia prima',
                'Temperatura fuera de rango al arranque',
                'Fallo de equipos auxiliares: bomba de agua, enfriador, compresor',
                'Espesor nominal de la orden no definido'
            ],
            // Nuevas secciones obligatorias
            descripcionProceso: {
                queHace: 'Extrusión por soplado (blown film) de polietileno de baja densidad para fabricar película tubular delgada.',
                queTransforma: 'Resina de polietileno en pellets -> Película tubular (manga) en rollos.',
                queRecibe: 'Resina LLDPE, LDPE, masterbatch y aditivos antibloqueo.',
                queEntrega: 'Rollos de película de polietileno pesados y medidos (espesor y ancho).'
            },
            tipoProceso: 'Continuo',
            metasProduccion: {
                metaEstandarTurno: 800,
                supuestosOperativos: 'Operación estable a 25 kg/h por máquina. Meta en kg totales por turno.',
                condicionesReduccionEficiencia: 'Cambios de ancho de burbuja, variaciones térmicas que afecten el espesor, o fallas en el anillo de aire.'
            },
            unidadesReporte: {
                produccion: 'kg',
                merma: 'kg',
                reporteMultiUnidad: false
            },
            catalogoParos: {
                operativos: ['Cambio de rollo', 'Ajuste de burbuja', 'Limpieza de filtro', 'Purga de material'],
                mecanicos: ['Falla ventilador de enfriamiento', 'Falla motor extrusor', 'Falla resistencias de calefacción'],
                calidad: ['Variación de espesor', 'Ancho fuera de rango', 'Gel en la película', 'Mala transparencia'],
                externos: ['Falta de resina', 'Falla energía', 'Falla suministro de agua']
            },
            personalOperativo: {
                minimo: 1,
                maximo: 2,
                reglasEspeciales: 'Un operador senior puede supervisar ambas máquinas PE si están en régimen estable.'
            },
            impactoVariabilidad: [
                { condicion: 'Corrientes de aire externas', impacto: 'Inestabilidad en la burbuja, causando variaciones críticas de ancho y espesor.' },
                { condicion: 'Mezcla inadecuada de resinas', impacto: 'Provoca geles y puntos de rotura en la película durante el soplado.' }
            ],
            parametrosCalidad: [
                {
                    nombre: 'espesor_mm',
                    etiqueta: 'Espesor',
                    unidad: 'mm',
                    nominal: 'desde_orden',
                    tolerancia: null,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición con micrómetro digital en 8 puntos de la burbuja.'
                },
                {
                    nombre: 'ancho_burbuja',
                    etiqueta: 'Ancho de Burbuja',
                    unidad: 'pulgadas',
                    nominal: 'desde_orden',
                    tolerancia: 0.25,
                    critico: false,
                    calculado: false,
                    metodologia: 'Medición física con cinta métrica.'
                },
                {
                    nombre: 'microperforado',
                    etiqueta: 'Microperforado',
                    unidad: null,
                    tipo: 'booleano_inspeccion',
                    nominal: 'desde_orden',
                    critico: true,
                    calculado: false,
                    metodologia: 'Inspección visual.'
                }
            ],
            parametrosInformativos: [
                {
                    nombre: 'materias_primas',
                    etiqueta: 'Materias Primas',
                    grupo: 'materias_primas',
                    tipo: 'lista_dinamica',
                    campos: [
                        { nombre: 'tipo', etiqueta: 'Tipo', unidad: '' },
                        { nombre: 'marca', etiqueta: 'Marca', unidad: '' },
                        { nombre: 'lote', etiqueta: 'Lote', unidad: '' },
                        { nombre: 'porcentaje', etiqueta: '% de uso', unidad: '%' }
                    ],
                    opcionesTipo: [
                        'LLDPE',
                        'LDPE',
                        'Reciclado',
                        'Masterbatch colorante',
                        'Anti bloqueo'
                    ]
                }
            ],
            frecuenciaMuestreo: {
                lecturasPorTurno: 4,
                unidadLectura: 'por_rollo',
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false
            },
            version: '1.1.0',
            fechaCreacion: '2025-01-20',
            responsable: 'Arquitecto Industrial Jules',
            motivo: 'Contrato actualizado con las 9 secciones obligatorias para cumplimiento de arquitectura senior.'
        });

        this.reglasProduccion = {
            modalidad: 'pesaje_por_rollo',
            rollosPorTurno: 2,
            unidad: 'kg'
        };

        this.reglasLote = {
            generacion: 'automatica',
            codigoFormato: '{codigo_orden}-EXTPE{NN}-{correlativo_3_digitos}',
            estadosLote: ['activo', 'pausado', 'cerrado']
        };
    }
}

module.exports = ExtrusionPEContract;
