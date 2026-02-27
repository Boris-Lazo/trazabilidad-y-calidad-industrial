const ProcessContract = require('./ProcessContract');

class ExtrusorPPContract extends ProcessContract {
    constructor() {
        super({
            processId: 1,
            nombre: 'Extrusor de Polipropileno',
            nombreCorto: 'Extrusor PP',
            unidadProduccion: 'kg',
            descripcionProducto: 'cinta rafia para saco de PP',
            patronCodigoOrden: '1\\d{6}',
            origenesOrden: ['masivo_excel', 'manual'],
            maquinasPermitidas: [],
            esInicioCADena: true,
            'procesosAguas abajo': [2],
            restriccionesInicio: [
                'Máquina en mantenimiento',
                'Falta de materia prima',
                'Temperatura fuera de rango al arranque',
                'Fallo de equipos auxiliares: bomba de agua, enfriador, compresor'
            ],
            parametrosCalidad: [
                {
                    nombre: 'denier',
                    etiqueta: 'Denier',
                    unidad: 'g/9000m',
                    minimo: 790,
                    maximo: 820,
                    nominal: null,
                    critico: false,
                    calculado: false,
                    metodologia: 'Promedio de 20 cintas de 50 m × 180'
                },
                {
                    nombre: 'resistencia',
                    etiqueta: 'Resistencia',
                    unidad: 'kg',
                    minimo: 4.0,
                    maximo: 5.0,
                    nominal: null,
                    critico: false,
                    calculado: false,
                    metodologia: 'Promedio de 20 cintas'
                },
                {
                    nombre: 'elongacion',
                    etiqueta: '% Elongación',
                    unidad: '%',
                    minimo: 14,
                    maximo: 20,
                    nominal: null,
                    critico: false,
                    calculado: false,
                    metodologia: 'Promedio de 20 cintas'
                },
                {
                    nombre: 'ancho_cinta',
                    etiqueta: 'Ancho de Cinta',
                    unidad: 'mm',
                    minimo: 2.9,
                    maximo: 3.1,
                    nominal: 3.0,
                    critico: false,
                    calculado: false,
                    metodologia: 'Promedio de 20 cintas'
                },
                {
                    nombre: 'tenacidad',
                    etiqueta: 'Tenacidad',
                    unidad: 'gf/den',
                    minimo: 4.5,
                    maximo: 5.5,
                    nominal: null,
                    critico: false,
                    calculado: true,
                    formula: '(resistencia * 1000) / denier',
                    dependencias: ['resistencia', 'denier'],
                    metodologia: 'Calculado automáticamente a partir de resistencia y denier'
                }
            ],
            parametrosInformativos: [
                // Máquina
                { nombre: 'rpm_tornillo', etiqueta: 'RPM Tornillo', unidad: 'RPM', grupo: 'maquina' },
                { nombre: 'velocidad_embobinadores', etiqueta: 'Velocidad Embobinadores', unidad: 'm/min', grupo: 'maquina' },

                // Temperaturas (12 zonas + pila + horno)
                { nombre: 'temp_zona_1', etiqueta: 'Temperatura Zona 1', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_2', etiqueta: 'Temperatura Zona 2', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_3', etiqueta: 'Temperatura Zona 3', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_4', etiqueta: 'Temperatura Zona 4', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_5', etiqueta: 'Temperatura Zona 5', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_6', etiqueta: 'Temperatura Zona 6', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_7', etiqueta: 'Temperatura Zona 7', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_8', etiqueta: 'Temperatura Zona 8', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_9', etiqueta: 'Temperatura Zona 9', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_10', etiqueta: 'Temperatura Zona 10', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_11', etiqueta: 'Temperatura Zona 11', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_12', etiqueta: 'Temperatura Zona 12', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_pila', etiqueta: 'Temperatura Pila', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_horno', etiqueta: 'Temperatura Horno', unidad: '°C', grupo: 'temperaturas' },

                // Ratios de unidades de estiraje
                { nombre: 'ratio_top_roller', etiqueta: 'Ratio Top Roller', unidad: '', grupo: 'ratios' },
                { nombre: 'ratio_holding', etiqueta: 'Ratio Holding', unidad: '', grupo: 'ratios' },
                { nombre: 'ratio_annealing', etiqueta: 'Ratio Annealing', unidad: '', grupo: 'ratios' },
                { nombre: 'ratio_stretching', etiqueta: 'Ratio Stretching', unidad: '', grupo: 'ratios' },

                // Materias primas
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
                        'Resina de polipropileno',
                        'Antifibrilante',
                        'Pelet (ciclado)',
                        'Filtro anti UV',
                        'Oxobiodegradable',
                        'Masterbatch colorante'
                    ]
                }
            ],
            frecuenciaMuestreo: {
                muestrasMinTurno: 3,
                distribucion: [
                    { indice: 1, descripcion: 'Primera tanda del turno', momento: 'inicio_turno' },
                    { indice: 2, descripcion: 'Muestra a la mitad del turno', momento: 'mitad_turno' },
                    { indice: 3, descripcion: 'Tanda dos horas antes del cierre del turno', momento: 'dos_horas_antes_cierre' }
                ],
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: true,
                copiarCampos: 'solo_informativos'
            },
            motivo: 'Contrato definitivo basado en el proceso real de Extrusor PP'
        });
    }
}

module.exports = ExtrusorPPContract;
