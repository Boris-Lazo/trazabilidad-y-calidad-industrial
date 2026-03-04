const ProcessContract = require('./ProcessContract');

class LaminadoContract extends ProcessContract {
    constructor() {
        super({
            processId: 3,
            nombre: 'Laminado',
            nombreCorto: 'Laminado',
            unidadProduccion: 'metros',
            descripcionProducto: 'tela de polipropileno laminada con cortina de polímero extruido',
            patronCodigoOrden: '3\\d{6}',
            origenesOrden: ['manual'],
            esInicioCadena: false,
            procesosAguasAbajo: [4, 5],
            rolesOperativosPermitidos: [
                'Inspector de calidad',
                'Técnico operador',
                'Auxiliar de operaciones'
            ],
            restriccionesInicio: [
                'Sin rollos de tela disponibles de Telares',
                'Falta de materia prima para cortina (resina, aditivos)',
                'Falla mecánica de la laminadora o su extrusor',
                'Temperatura fuera de rango al arranque',
                'Cambio de orden en proceso'
            ],
            maquinasPermitidas: ['LAM01'],
            // Nuevas secciones obligatorias
            descripcionProceso: {
                queHace: 'Recubrimiento de tela circular con una capa delgada de polímero fundido para impermeabilización y refuerzo.',
                queTransforma: 'Tela circular + Resina de laminación -> Tela laminada.',
                queRecibe: 'Rollos de tela de telares y resinas de polietileno/polipropileno.',
                queEntrega: 'Rollos de tela laminada listos para impresión o conversión.'
            },
            tipoProceso: 'Por orden',
            metasProduccion: {
                metaEstandarTurno: 21000,
                supuestosOperativos: 'Velocidad de línea de 40 m/min. Meta en metros lineales.',
                condicionesReduccionEficiencia: 'Problemas de adherencia, fallas en el tratador corona, o defectos en la tela base. Los cambios de estilo afectan la eficiencia.'
            },
            unidadesReporte: {
                produccion: 'metros',
                merma: 'kg',
                reporteMultiUnidad: true
            },
            catalogoParos: {
                operativos: ['Montaje de rollo', 'Cambio de receta', 'Limpieza de labios de dado', 'Enhebrado'],
                mecanicos: ['Falla extrusor laminación', 'Falla sistema de enfriamiento', 'Falla tratador corona'],
                calidad: ['Baja adherencia', 'Variación de gramaje cortina', 'Ancho incorrecto'],
                externos: ['Falta de tela base', 'Falla energía', 'Falta de resina']
            },
            personalOperativo: {
                minimo: 2,
                maximo: 2,
                reglasEspeciales: '2 personas.'
            },
            impactoVariabilidad: [
                { condicion: 'Humedad en resina de laminación', impacto: 'Causa ojos de pescado y falta de adherencia.' },
                { condicion: 'Tensión irregular en tela base', impacto: 'Provoca arrugas en el laminado y desperdicio de material.' }
            ],
            parametrosCalidad: [
                {
                    nombre: 'gramaje_cortina',
                    etiqueta: 'Gramaje de Cortina',
                    unidad: 'g/m²',
                    nominal: 20,
                    tolerancia: 3,
                    minimo: 17,
                    maximo: 23,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física por rollo laminado. El sistema evalúa cumple si el valor está entre 17 y 23 g/m².'
                },
                {
                    nombre: 'gramaje_tejido',
                    etiqueta: 'Gramaje de Tejido (Referencial)',
                    unidad: 'g/m²',
                    nominal: null,
                    tolerancia: null,
                    critico: false,
                    calculado: false,
                    soloInformativo: true,
                    metodologia: 'Medición física por rollo. No tiene rango de cumplimiento definido en este proceso. El peso del tejido está determinado por el denier de la cinta producida en Extrusor PP.'
                },
                {
                    nombre: 'adherencia',
                    etiqueta: 'Adherencia de Cortina',
                    unidad: 'booleano',
                    tipo: 'pasa_no_pasa',
                    critico: true,
                    calculado: false,
                    metodologia: 'Prueba manual por rollo. El inspector determina si la cortina adhiere correctamente a la tela. Resultado: Pasa / No pasa.'
                },
                {
                    nombre: 'ancho_tela',
                    etiqueta: 'Ancho de Tela Laminada',
                    unidad: 'pulgadas',
                    nominal: null,
                    tolerancia: 0.25,
                    critico: true,
                    calculado: false,
                    metodologia: 'Medición física por rollo. El nominal viene de la orden activa. Tolerancia fija ±0.25 pulgadas igual que en proceso de Telares.',
                    notaFrontend: 'Ingresar valores en fracciones de 1/8 (ej: 12 1/8, 12 1/2).'
                }
            ],
            parametrosInformativos: [
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
                { nombre: 'temp_zona_13', etiqueta: 'Temperatura Zona 13', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_zona_14', etiqueta: 'Temperatura Zona 14', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'temp_rodo_precalentamiento', etiqueta: 'Temperatura Rodo de Precalentamiento', unidad: '°C', grupo: 'temperaturas' },
                { nombre: 'rpm_extrusor', etiqueta: 'RPM Extrusor de Laminado', unidad: 'RPM', grupo: 'maquina' },
                { nombre: 'velocidad_linea', etiqueta: 'Velocidad de Línea', unidad: 'm/min', grupo: 'maquina' },
                { nombre: 'amperaje_tratador_corona', etiqueta: 'Amperaje Tratador Corona', unidad: 'A', grupo: 'maquina' },
                {
                    nombre: 'acumulado_contador',
                    etiqueta: 'Acumulado Contador al cierre del tramo',
                    unidad: 'metros',
                    grupo: 'produccion_contador',
                    tipo: 'numerico_entero',
                    nota: 'Mismo esquema que Telares. La producción real se calcula como diferencia contra el registro anterior.'
                },
                {
                    nombre: 'orden_activa',
                    etiqueta: 'Orden Activa',
                    grupo: 'produccion_contador',
                    tipo: 'referencia_orden'
                },
                {
                    nombre: 'codigo_rollo_activo',
                    etiqueta: 'Código de Rollo Activo',
                    grupo: 'produccion_contador',
                    tipo: 'texto',
                    nota: 'Código del rollo de Telares que se está laminando en este tramo.'
                }
            ],
            frecuenciaMuestreo: {
                frecuencia: 'por_rollo',
                descripcion: 'Se registra un conjunto de parámetros de calidad por cada rollo laminado en el turno. No hay un número fijo de muestras — depende de cuántos rollos se procesen.',
                muestrasMinTurno: 1,
                omisionRequiereMotivo: true,
                permiteCopiarMuestraAnterior: false,
                nota: 'Los parámetros operativos (temperaturas, RPM, velocidad) no cambian rollo a rollo dentro del mismo tramo de orden. Solo se registran una vez por tramo. Los parámetros de calidad se registran individualmente por rollo.'
            },
            version: '1.1.0',
            fechaCreacion: '2025-01-20',
            responsable: 'Arquitecto Industrial Jules',
            motivo: 'Contrato actualizado con las 9 secciones obligatorias para cumplimiento de arquitectura senior.'
        });

        // Campos específicos de laminado
        this.totalMaquinas = 1;
        this.procesosAguasArriba = [2];

        this.reglasProduccion = {
            metodo: 'diferencia_acumulado_contador',
            descripcion: 'Igual que Telares. El operario registra el valor acumulado del contador de metros al cerrar el tramo o al cambiar de orden. La producción es la diferencia contra el último acumulado registrado.',
            unidad: 'metros',
            registroPorCambioDeOrden: true,
            rolloParcialEntreturnos: true,
            notaRolloParcial: 'Un rollo de tela puede iniciar su laminado en un turno y completarse en el siguiente. Cada turno registra sus metros procesados de ese rollo de forma independiente usando el mismo código de rollo. El sistema no vincula los tramos — cada registro es autónomo dentro de su bitácora.'
        };

        this.reglasRollosEntrada = {
            descripcion: 'Laminado consume rollos de tela producidos por Telares (proceso 2). Cada rollo se registra individualmente por su código.',
            formatoCodigo: 'R{numero_rollo_3_digitos}-T{numero_telar_2_digitos}',
            ejemploCodigo: 'R047-T05',
            registroIndividual: true,
            notaCodigo: 'El operario escribe el código manualmente. Si el código existe en la base de datos (tabla calidad_telares_visual o registros_trabajo de proceso 2), el sistema muestra los datos del rollo como referencia. Si no existe, se permite entrada libre sin bloquear el registro.',
            rolloParcial: true,
            notaRolloParcial: 'Si el rollo no se lamina completo en el turno, el operario registra los metros procesados en ese turno. El mismo código puede aparecer en bitácoras de turnos distintos.',
            camposRegistro: [
                { nombre: 'codigo_rollo', tipo: 'string', obligatorio: true },
                { nombre: 'metros_laminados', tipo: 'numero', descripcion: 'diferencia de contador' },
                { nombre: 'orden_id', tipo: 'FK', descripcion: 'orden de producción proceso 3' }
            ]
        };

        this.materiasPrimasCortina = {
            descripcion: 'El extrusor integrado de la laminadora produce la cortina de polímero que recubre la tela. El operario sigue una receta predefinida. Las materias primas se registran igual que en Extrusor PP: tipo, marca, lote y porcentaje de uso. La suma de porcentajes debe ser 100%.',
            opcionesTipo: [
                'Polipropileno de inyección',
                'LDPE',
                'Pelet (material reciclado)',
                'Aditivo anti UV',
                'Oxobiodegradable',
                'Masterbatch colorante'
            ],
            camposPorMaterial: [
                { nombre: 'tipo', seleccion: 'opcionesTipo' },
                { nombre: 'marca', tipo: 'texto libre' },
                { nombre: 'lote', tipo: 'texto libre' },
                { nombre: 'porcentaje', tipo: 'numérico', validacion: 'suma total debe ser 100%' },
                {
                    nombre: 'hoja_tecnica_pdf',
                    tipo: 'archivo PDF opcional',
                    nota: 'La hoja técnica se asocia al lote específico del material. Se permite subir un PDF por entrada de material. No es obligatorio para guardar.'
                }
            ],
            maximoMateriales: 6,
            registroCambio: 'Se registra al inicio del turno y en cada cambio de receta dentro del turno.'
        };

        this.peliculaImpresa = {
            aplica: 'condicional según orden de producción',
            descripcion: 'Algunas órdenes requieren laminar sobre película impresa comprada a proveedor externo. No viene de ningún proceso interno del sistema.',
            unidadRegistro: 'kg',
            camposRegistro: [
                { nombre: 'aplica_pelicula', tipo: 'boolean', origen: 'orden' },
                { nombre: 'proveedor', tipo: 'texto libre' },
                { nombre: 'referencia_material', tipo: 'texto libre' },
                { nombre: 'kg_consumidos', tipo: 'numérico' }
            ],
            nota: 'No se gestiona como lote interno. Solo se registra como material consumido dentro del turno.'
        };

        this.verificacionColor = {
            descripcion: 'El color de la cortina lo define el masterbatch colorante de la receta. Se verifica contra el color especificado en la orden.',
            parametros: [
                {
                    nombre: 'color_cortina',
                    etiqueta: 'Color de Cortina',
                    tipo: 'cumple_no_cumple',
                    referencia: 'orden'
                }
            ],
            frecuencia: 'por_cambio_de_orden_y_una_vez_por_turno',
            accionSiNoCumple: 'REVISION_OBLIGATORIA',
            nota: 'Si el color no cumple se debe registrar en observaciones con explicación. A diferencia de Telares no implica paro automático, pero sí requiere justificación documentada.'
        };

        this.reglasDesperdicio = {
            unidad: 'kg',
            descripcion: 'El desperdicio de laminado se registra en kg por turno. Puede destinarse a Peletizado (proceso 8) o a descarte final.',
            destinos: ['Peletizado', 'Descarte final'],
            registroObligatorio: true,
            nota: 'Siempre existe desperdicio aunque sea mínimo. Debe registrarse aunque no haya producción.'
        };
    }
}

module.exports = LaminadoContract;
