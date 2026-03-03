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
            maquinasPermitidas: ['EXTPP'],
            esInicioCadena: true,
            procesosAguasAbajo: [2],
            restriccionesInicio: [
                'Máquina en mantenimiento',
                'Falta de materia prima',
                'Temperatura fuera de rango al arranque',
                'Fallo de equipos auxiliares: bomba de agua, enfriador, compresor'
            ],
            // Nuevas secciones obligatorias
            descripcionProceso: {
                queHace: 'Transforma resina de polipropileno virgen y material recuperado en cinta de rafia de alta resistencia mediante extrusión por dado plano.',
                queTransforma: 'Resina en pellets -> Cinta técnica embobinada.',
                queRecibe: 'Resina PP, Masterbatch, Aditivos UV y Antifibrilantes.',
                queEntrega: 'Bobinas de cinta de rafia pesadas y etiquetadas.'
            },
            tipoProceso: 'Continuo',
            metasProduccion: {
                metaEstandarTurno: 1000,
                supuestosOperativos: 'Operación continua, sin reserva.',
                condicionesReduccionEficiencia: 'Cambios de color, purgas por contaminación de material, o fallas en sistema de estiraje.'
            },
            unidadesReporte: {
                produccion: 'kg',
                merma: 'kg',
                reporteMultiUnidad: false
            },
            catalogoParos: {
                operativos: ['Cambio de bobinas', 'Limpieza de dado', 'Ajuste de denier', 'Carga de material'],
                mecanicos: ['Falla motor principal', 'Rotura de banda', 'Falla resistencias', 'Falla embobinadores'],
                calidad: ['Denier fuera de rango', 'Resistencia baja', 'Ancho irregular'],
                externos: ['Falla energía eléctrica', 'Falta de personal', 'Falta de materia prima']
            },
            personalOperativo: {
                minimo: 1,
                maximo: 2,
                reglasEspeciales: 'Requiere un operador senior para el arranque y un auxiliar para cambios de bobina durante régimen estable.'
            },
            impactoVariabilidad: [
                { condicion: 'Humedad en resina', impacto: 'Genera burbujas y roturas en la cortina, reduciendo producción.' },
                { condicion: 'Uso de material recuperado > 20%', impacto: 'Reduce la tenacidad de la cinta y requiere ajustes frecuentes de temperatura.' }
            ],
            parametrosCalidad: [
                {
                    nombre: 'denier',
                    etiqueta: 'Denier',
                    unidad: 'g/9000m',
                    minimo: 790,
                    maximo: 820,
                    nominal: 800,
                    critico: true,
                    calculado: false,
                    metodologia: 'Promedio de 20 cintas de 50 m × 180'
                },
                {
                    nombre: 'resistencia',
                    etiqueta: 'Resistencia',
                    unidad: 'kg',
                    minimo: 4.0,
                    maximo: 5.0,
                    nominal: 4.5,
                    critico: true,
                    calculado: false,
                    metodologia: 'Promedio de 20 cintas'
                },
                {
                    nombre: 'elongacion',
                    etiqueta: '% Elongación',
                    unidad: '%',
                    minimo: 14,
                    maximo: 20,
                    nominal: 17,
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
                    nominal: 5.0,
                    critico: false,
                    calculado: true,
                    formula: '(resistencia * 1000) / denier',
                    dependencias: ['resistencia', 'denier'],
                    metodologia: 'Calculado automáticamente a partir de resistencia y denier'
                }
            ],
            parametrosInformativos: [
                { nombre: 'rpm_tornillo', etiqueta: 'RPM Tornillo', unidad: 'RPM', grupo: 'maquina' },
                { nombre: 'velocidad_embobinadores', etiqueta: 'Velocidad Embobinadores', unidad: 'm/min', grupo: 'maquina' },
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
                { nombre: 'ratio_top_roller', etiqueta: 'Ratio Top Roller', unidad: '', grupo: 'ratios' },
                { nombre: 'ratio_holding', etiqueta: 'Ratio Holding', unidad: '', grupo: 'ratios' },
                { nombre: 'ratio_annealing', etiqueta: 'Ratio Annealing', unidad: '', grupo: 'ratios' },
                { nombre: 'ratio_stretching', etiqueta: 'Ratio Stretching', unidad: '', grupo: 'ratios' },
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
                copiarCampos: {
                    modo: 'por_grupo',
                    grupos: [
                        { grupo: 'temperaturas', etiqueta: 'Temperaturas', copiable: true },
                        { grupo: 'ratios', etiqueta: 'Ratios de Estiraje', copiable: true },
                        { grupo: 'maquina', etiqueta: 'Parámetros de Máquina', copiable: true },
                        { grupo: 'materias_primas', etiqueta: 'Materias Primas', copiable: true }
                    ],
                    nota: 'El operario selecciona qué grupos copiar del turno anterior. Los parámetros de calidad nunca se copian, siempre se ingresan manualmente.'
                }
            },
            version: '1.1.0',
            fechaCreacion: '2025-01-20',
            responsable: 'Arquitecto Industrial Jules',
            motivo: 'Contrato actualizado con las 9 secciones obligatorias para cumplimiento de arquitectura senior.'
        });

        this.reglasLote = {
            generacion: 'automatica',
            descripcion: 'El sistema genera un lote por cada combinación única ' +
                'de orden de producción y bitácora de turno. Si el extrusor cambia ' +
                'de orden dentro del turno, se genera un nuevo lote para la nueva ' +
                'orden en esa misma bitácora.',
            codigoFormato: '{codigo_orden}-{correlativo_3_digitos}',
            codigoEjemplo: '1000056-003',
            correlativo: {
                alcance: 'por_orden',
                descripcion: 'El correlativo incrementa cada vez que la orden genera ' +
                    'un lote nuevo en cualquier turno, acumulado histórico. ' +
                    'Nunca reinicia salvo que la orden sea cancelada y recreada.',
                formato: '3 dígitos con cero a la izquierda'
            },
            estadosLote: ['activo', 'pausado', 'cerrado'],
            transicionEstado: 'El lote permanece activo mientras la orden esté ' +
                'en producción. Se cierra cuando la orden se cierra o cancela.',
            responsableGeneracion: 'sistema',
            momentoGeneracion: 'al guardar producción del turno si no existe ' +
                'lote previo para esa combinación orden+bitácora'
        };
    }
}

module.exports = ExtrusorPPContract;
