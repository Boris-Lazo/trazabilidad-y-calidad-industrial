/**
 * @file ImprentaContract.js
 * @description Contrato de proceso para el área de Imprenta.
 * Define las reglas de negocio, parámetros de calidad, frecuencia de muestreo
 * y especificaciones técnicas para la impresión de tela de polipropileno.
 */

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
            procesosAguasArriba: [2, 3],
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
            maquinasPermitidas: ['IMP01'],
            totalMaquinas: 1,
            parametrosCalidad: [
                {
                    nombre: 'viscosidad_tinta',
                    etiqueta: 'Viscosidad de Tinta',
                    unidad: 'segundos (Copa Zahn #2)',
                    minimo: 19,
                    maximo: 25,
                    nominal: 22,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición con Copa Zahn #2. Se mide el tiempo de vaciado en segundos. Rango aceptable: 19 a 25 segundos. Resultado: Cumple si está dentro del rango, No cumple si está fuera.',
                    nota: 'Se mide independientemente por cada tinta activa en la orden.'
                },
                {
                    nombre: 'adherencia_tinta',
                    etiqueta: 'Adherencia de Tinta',
                    unidad: 'booleano',
                    tipo: 'pasa_no_pasa',
                    critico: true,
                    calculado: false,
                    metodologia: 'Prueba manual de adherencia por tinta. Resultado: Pasa / No pasa.',
                    nota: 'Se mide independientemente por cada tinta activa en la orden.'
                }
            ],
            parametrosInformativos: [
                {
                    nombre: 'velocidad_linea',
                    etiqueta: 'Velocidad de Línea',
                    unidad: 'm/min',
                    grupo: 'maquina'
                },
                {
                    nombre: 'tension_sustrato',
                    etiqueta: 'Tensión del Sustrato',
                    unidad: 'N',
                    grupo: 'maquina'
                },
                {
                    nombre: 'codigo_rollo_activo',
                    etiqueta: 'Código de Rollo Activo',
                    tipo: 'texto',
                    grupo: 'produccion_rollo',
                    nota: 'Código del rollo que se está procesando. Formato R047-T05 o R047-T05-L001 según origen.'
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
                    {
                        indice: 1,
                        momento: 'inicio_turno',
                        descripcion: 'Primera inspección — al inicio del turno o al inicio de nueva orden'
                    },
                    {
                        indice: 2,
                        momento: 'mitad_turno',
                        descripcion: 'Segunda inspección — a mitad del turno'
                    },
                    {
                        indice: 3,
                        momento: 'casi_cierre_turno',
                        descripcion: 'Tercera inspección — antes del cierre del turno'
                    }
                ],
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false,
                notaCambioEstilo: 'Si durante el turno hay un cambio de estilo/arte, el tiempo entre inspecciones puede extenderse. La inspección no se omite, se retrasa hasta que el cambio esté completado y la máquina esté produciendo en condiciones estables.'
            },
            version: '1.0.0',
            fechaCreacion: '2025-01-01',
            responsable: 'Sistema (Despliegue)',
            motivo: 'Contrato inicial completo para proceso de Imprenta. Define consumo de rollos de Telares o Laminado por código individual con metros y impresiones por rollo, registro de tintas por color Pantone (hasta 8: 5 frente y 3 dorso) con viscosidad Copa Zahn #2 (19-25 seg) y adherencia por tinta, 3 inspecciones por turno, evidencias fotográficas opcionales, desperdicio clasificado por cuadre o defecto de entrada con destino a Peletizado, y especificaciones de orden con código de arte, dimensiones de saco y origen del rollo de entrada.'
        });

        // Asegurar que campos no definidos en la clase base sean accesibles
        this.totalMaquinas = 1;
        this.procesosAguasArriba = [2, 3];

        // Campos nuevos específicos de imprenta
        this.reglasProduccion = {
            metodo: 'conteo_impresiones',
            descripcion: 'La producción se mide en impresiones, no en metros. Cada impresión corresponde a un saco con las dimensiones definidas en la orden (ancho y largo en pulgadas). El largo varía por orden entre 31 y 49 pulgadas.',
            unidad: 'impresiones',
            registroPorRollo: true,
            descripcionRegistroPorRollo: 'Por cada rollo procesado se registra el código del rollo, los metros consumidos del rollo y las impresiones producidas de ese rollo.',
            registroPorCambioDeOrden: true,
            nota: 'A diferencia de Telares y Laminado, la producción no usa contador de metros. Se cuenta directamente el número de impresiones producidas por rollo.'
        };

        this.reglasRollosEntrada = {
            descripcion: 'Imprenta consume rollos que pueden provenir de dos procesos distintos según la orden.',
            origenesRollo: [
                {
                    proceso_id: 2,
                    nombre: 'Telares',
                    formatoCodigo: 'R{3_digitos}-T{2_digitos}',
                    ejemploCodigo: 'R047-T05'
                },
                {
                    proceso_id: 3,
                    nombre: 'Laminado',
                    formatoCodigo: 'R{3_digitos}-T{2_digitos}-L{3_digitos}',
                    ejemploCodigo: 'R047-T05-L001',
                    nota: 'El rollo de laminado hereda el código del rollo de telares que lo originó y agrega un correlativo de laminado.'
                }
            ],
            registroIndividual: true,
            notaCodigo: 'El operario escribe el código manualmente. Si el código existe en la base de datos, el sistema muestra los datos del rollo como referencia. Si no existe, se permite entrada libre sin bloquear el registro.',
            camposRegistroPorRollo: [
                { nombre: 'codigo_rollo', tipo: 'string', obligatorio: true },
                { nombre: 'origen_proceso_id', descripcion: '2 o 3, inferido del formato del código' },
                { nombre: 'metros_consumidos', tipo: 'numérico', obligatorio: true },
                { nombre: 'impresiones_producidas', tipo: 'numérico', obligatorio: true },
                { nombre: 'orden_id', tipo: 'FK', descripcion: 'orden de producción proceso 4' }
            ]
        };

        this.reglasTintas = {
            descripcion: 'Cada orden define los colores Pantone a imprimir. La imprenta puede imprimir hasta 8 colores: 5 en el frente y 3 en el dorso. Cada color es una tinta independiente con su propio registro de materia prima y parámetros de calidad.',
            maximoColores: 8,
            distribucion: {
                frente: {
                    maxColores: 5,
                    etiqueta: 'Frente'
                },
                dorso: {
                    maxColores: 3,
                    etiqueta: 'Dorso'
                }
            },
            camposPorTinta: [
                { nombre: 'posicion', opciones: ['frente', 'dorso'] },
                { nombre: 'numero_color', descripcion: 'entero 1-5 para frente, 1-3 para dorso' },
                { nombre: 'codigo_pantone', tipo: 'texto', origen: 'orden' },
                { nombre: 'tipo', tipo: 'texto libre', descripcion: 'nombre del color' },
                { nombre: 'marca', tipo: 'texto libre' },
                { nombre: 'lote', tipo: 'texto libre' }
            ],
            nota: 'Las tintas se registran al inicio del turno y en cada cambio de orden. Son la materia prima principal del proceso.'
        };

        this.reglasEvidencias = {
            descripcion: 'Como registro de calidad se pueden adjuntar fotografías de la impresión. No son obligatorias pero se recomienda su uso.',
            tipo: 'imagen',
            formatos: ['jpg', 'jpeg', 'png'],
            obligatorio: false,
            maximoPorInspeccion: 5,
            asociacion: 'Las imágenes se asocian a la inspección de calidad (índice 1, 2 o 3) y a la orden activa.',
            nota: 'Las imágenes son evidencia de calidad del resultado de impresión, no del proceso operativo.'
        };

        this.reglasArte = {
            descripcion: 'Cada orden de imprenta referencia un código de arte que identifica el diseño del cliente.',
            camposEspecificacionesOrden: [
                { nombre: 'codigo_arte', tipo: 'texto', descripcion: 'identificador del diseño' },
                { nombre: 'colores_pantone', tipo: 'lista', descripcion: 'hasta 8 códigos Pantone con posición y número de color' },
                { nombre: 'ancho_saco', tipo: 'numérico', unidad: 'pulgadas' },
                {
                    nombre: 'largo_saco',
                    tipo: 'numérico',
                    unidad: 'pulgadas',
                    rango: '31 a 49 pulgadas'
                },
                { nombre: 'proceso_origen_rollo', opciones: [2, 3] }
            ],
            nota: 'El código de arte es solo una referencia. No se almacenan archivos de arte en el sistema.'
        };

        this.reglasDesperdicio = {
            unidad: 'kg',
            tipos: [
                {
                    id: 'DESP-01',
                    nombre: 'Desperdicio por cuadre',
                    descripcion: 'Material descartado durante el ajuste y cuadre de la impresión al inicio de orden o cambio de estilo.'
                },
                {
                    id: 'DESP-02',
                    nombre: 'Desperdicio por defecto de entrada',
                    descripcion: 'Metros rechazados por defectos que provienen del material de entrada (Laminado principalmente). Se documenta el origen en observaciones.'
                }
            ],
            destinos: ['Peletizado', 'Descarte final'],
            registroObligatorio: true,
            nota: 'Siempre debe registrarse desperdicio aunque sea 0 kg. El tipo de desperdicio es importante para KPIs de calidad y trazabilidad de defectos entre procesos.'
        };
    }
}

module.exports = ImprentaContract;
