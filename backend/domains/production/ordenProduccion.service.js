// Servicio para órdenes de producción
const XLSX = require('xlsx');
const { parsearFila } = require('./ordenProduccion.parser');
const ValidationError = require('../../shared/errors/ValidationError');
const DomainError = require('../../shared/errors/DomainError');
const NotFoundError = require('../../shared/errors/NotFoundError');

const MAPEO_SAP = {
  'ExtruPP': 1,
  'Extrusión PP': 1,
  'Telar': 2,
  'Laminado': 3,
  'Imprenta': 4,
  'ConverSA': 5,
  'Conversión SA': 5,
  'ExtruPE': 6,
  'Extrusión PE': 6,
  'ConverLI': 7,
  'Conversión Liner PE': 7,
  'Peletiza': 8,
  'VestidoM': 9,
  'Sacos Vestidos': 9
};

const UNIDADES_PROCESO = {
  1: 'kg',        // ExtruPP
  2: 'metros',    // Telar
  3: 'metros',    // Laminado
  4: 'impresiones', // Imprenta
  5: 'unidades',  // ConverSA
  6: 'kg',        // ExtruPE
  7: 'unidades',  // ConverLI
  8: 'kg',        // Peletiza
  9: 'unidades'   // VestidoM
};

function obtenerUnidadPorProceso(procesoId) {
  return UNIDADES_PROCESO[procesoId] || 'Unidades';
}

class OrdenProduccionService {
  /**
   * @param {OrdenProduccionRepository} ordenProduccionRepository
   * @param {AuditService} auditService
   */
  constructor(ordenProduccionRepository, auditService) {
    this.ordenProduccionRepository = ordenProduccionRepository;
    this.auditService = auditService;
  }

  async getAll(filters = {}) {
    return await this.ordenProduccionRepository.findAll(filters);
  }

  async getById(id) {
    return await this.ordenProduccionRepository.findById(id);
  }

  async create(data) {
    // Validar prefijo del código de orden (7 dígitos ya validados por Zod)
    const prefix = parseInt(data.codigo_orden[0]);
    if (prefix < 1 || prefix > 9) {
        throw new ValidationError('El primer dígito de la orden debe estar entre 1 y 9.');
    }

    const id = await this.ordenProduccionRepository.create({
        ...data,
        estado: 'Creada'
    });
    return await this.ordenProduccionRepository.findById(id);
  }

  async update(id, data, usuario = 'SISTEMA') {
    const existing = await this.ordenProduccionRepository.findById(id);
    if (!existing) throw new NotFoundError('Orden no encontrada');

    // Si la orden está liberada o en producción, solo permitir cambios de estado o motivo_cierre
    const restrictedStates = ['Liberada', 'En producción', 'Pausada', 'Cerrada', 'Cancelada'];
    if (restrictedStates.includes(existing.estado)) {
        const allowedKeys = ['estado', 'motivo_cierre'];
        const keys = Object.keys(data);
        const hasRestrictedChanges = keys.some(k => !allowedKeys.includes(k));

        if (hasRestrictedChanges) {
            throw new ValidationError(`La orden ya está en estado ${existing.estado} y no permite modificaciones técnicas.`);
        }
    }

    // Validar cambio a Cerrada o Cancelada
    if ((data.estado === 'Cerrada' || data.estado === 'Cancelada') && !data.motivo_cierre) {
        throw new ValidationError('Es obligatorio proporcionar un motivo para cerrar o cancelar la orden.');
    }

    await this.ordenProduccionRepository.update(id, data);

    // Auditoría de cambio
    if (data.estado && data.estado !== existing.estado) {
        await this.auditService.logStatusChange(usuario, 'OrdenProduccion', id, existing.estado, data.estado, data.motivo_cierre || 'Cambio de estado');
    } else {
        await this.auditService.logUpdate(usuario, 'OrdenProduccion', id, existing, data, 'Actualización de orden');
    }

    return await this.ordenProduccionRepository.findById(id);
  }

  async remove(id) {
    return await this.ordenProduccionRepository.remove(id);
  }

  /**
   * Detecta dinámicamente la fila de encabezados y mapea las columnas necesarias.
   * @param {Array[]} filas - Matriz de datos de Excel.
   * @returns {Object|null} Mapeo de campos a índices de columna o null si no se detecta.
   */
  _detectarEncabezados(filas) {
    const KEYWORDS = {
      nombreSap:       ['centro', 'proceso', 'nombre sap', 'operación', 'fase'],
      codigoDoc:      ['nº documento', 'orden', 'doc', 'código', 'número'],
      descripcion:    ['texto breve material', 'descripción', 'producto', 'material'],
      cantPlanificada: ['cantidad planificada', 'ctd.planificada', 'objetivo', 'planificada'],
      cantCompletada:  ['cantidad confirmada', 'ctd.confirmada', 'completada', 'confirmada'],
      cantPendiente:   ['cantidad pendiente', 'ctd.pendiente', 'pendiente'],
      fechaPedido:     ['fecha de pedido', 'pedido', 'creación'],
      fechaInicio:     ['fecha de inicio', 'inicio', 'programada'],
      fechaVencimiento:['fecha de vencimiento', 'vencimiento', 'entrega', 'fin']
    };

    for (let i = 0; i < Math.min(filas.length, 20); i++) {
      const fila = filas[i];
      if (!Array.isArray(fila)) continue;

      const mapeo = {};
      let coincidencias = 0;

      for (const [campo, sinonimos] of Object.entries(KEYWORDS)) {
        const index = fila.findIndex(celda => {
          if (!celda) return false;
          const normalizada = String(celda).toLowerCase().trim();
          return sinonimos.some(s => normalizada.includes(s.toLowerCase()));
        });

        if (index !== -1) {
          mapeo[campo] = index;
          coincidencias++;
        }
      }

      // Si encontramos al menos 4 columnas clave (incluyendo Nº documento), asumimos que es el encabezado
      if (coincidencias >= 4 && mapeo.codigoDoc !== undefined) {
        return { indexHeader: i, mapeo };
      }
    }
    return null;
  }

  async procesarImportacionExcel(buffer, usuario) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // Validar estructura del archivo
    if (filas.length < 4) {
      throw new ValidationError(
        'El archivo no contiene datos. Verifique que sea el reporte de Órdenes de SAP.'
      );
    }

    // Validar encabezados en fila índice 2
    const headers = filas[2] || [];
    if (!headers.includes('Series de documentos') || !headers.includes('Nº documento')) {
      throw new ValidationError(
        'El archivo no tiene el formato esperado de SAP. ' +
        'Columnas requeridas: "Series de documentos" y "Nº documento". ' +
        'Asegúrese de exportar el reporte de Órdenes de Producción desde SAP.'
      );
    }

    // Datos desde fila índice 3 (fila 4 del Excel)
    const datos = filas.slice(3);

    const resultado = {
      total_filas_excel: 0,
      nuevas: [],           // órdenes que NO existen en PROD-SYS → se pueden importar
      ya_existentes: [],    // órdenes que YA existen en PROD-SYS → NO tocar
      no_reconocidas: [],   // series SAP desconocidas → mostrar al usuario
      requieren_validacion: 0
    };

    for (const filaArr of datos) {
      // Ignorar filas completamente vacías
      if (!filaArr || filaArr.every(c => c === null || c === '')) continue;

      // col[2] = Nº documento (7 dígitos numéricos)
      const codigoDoc = filaArr[2];
      if (!codigoDoc || !/^\d{7}$/.test(String(codigoDoc).trim())) continue;

      resultado.total_filas_excel++;

      // slice(1) elimina la columna vacía (col[0])
      // parsearFila recibe: [Serie, Nº doc, Descripción, CantPlan, ...]
      const ordenParseada = parsearFila(filaArr.slice(1), MAPEO_SAP);

      // Serie SAP no reconocida → registrar para feedback al usuario
      if (!ordenParseada.proceso_id) {
        resultado.no_reconocidas.push({
          codigo_orden: ordenParseada.codigo_orden,
          nombre_proceso_sap: ordenParseada.nombre_proceso_sap,
          descripcion_producto: ordenParseada.descripcion_producto,
          motivo: `Serie SAP desconocida: "${ordenParseada.nombre_proceso_sap}". ` +
                  `Agregar al MAPEO_SAP si es un proceso válido.`
        });
        continue;
      }

      // Verificar si ya existe en PROD-SYS
      const existente = await this.ordenProduccionRepository.findByCodigoOrden(
        ordenParseada.codigo_orden
      );

      if (existente) {
        // PROD-SYS tiene prioridad: guardar datos de PROD-SYS para mostrar al usuario
        resultado.ya_existentes.push({
          codigo_orden: existente.codigo_orden,
          estado_prodsys: existente.estado,
          // Datos de SAP (solo informativos, NO se usarán para actualizar)
          sap_cantidad_planificada: ordenParseada.cantidad_planificada,
          sap_fecha_vencimiento: ordenParseada.fecha_vencimiento,
          motivo: 'Ya existe en PROD-SYS. Sus datos están actualizados en tiempo real.'
        });
      } else {
        if (ordenParseada.requiere_validacion) {
          resultado.requieren_validacion++;
        }
        resultado.nuevas.push(ordenParseada);
      }
    }

    return resultado;
  }

  async confirmarImportacion(ordenes, usuario) {
    if (!Array.isArray(ordenes) || ordenes.length === 0) {
      throw new ValidationError('No se recibieron órdenes para importar.');
    }

    const errores = [];
    const validadas = [];

    for (const orden of ordenes) {
      const { codigo_orden, proceso_id, cantidad_planificada, especificaciones } = orden;

      // Validar código de orden
      if (!/^\d{7}$/.test(String(codigo_orden))) {
        errores.push({ codigo_orden, error: 'Código de orden debe tener 7 dígitos' });
        continue;
      }

      // Validar proceso_id
      const pId = parseInt(proceso_id);
      if (isNaN(pId) || pId < 1 || pId > 9) {
        errores.push({ codigo_orden, error: 'Proceso ID debe estar entre 1 y 9' });
        continue;
      }

      // Validar cantidad: debe ser número válido (acepta decimales y negativos)
      // Negativo = sobreproducción en SAP, es válido
      const cantNum = parseFloat(cantidad_planificada);
      if (isNaN(cantNum)) {
        errores.push({ codigo_orden, error: 'La cantidad planificada no es un número válido' });
        continue;
      }

      // Verificar una vez más que no exista en PROD-SYS
      // (puede haber sido creada entre previsualizar y confirmar)
      const existente = await this.ordenProduccionRepository.findByCodigoOrden(codigo_orden);
      if (existente) {
        // No es error, simplemente omitir silenciosamente
        continue;
      }

      // Validaciones específicas por proceso (campos que requieren input del usuario)
      if (pId === 4 && especificaciones &&
          especificaciones.costura_posicion !== 'arriba' &&
          especificaciones.costura_posicion !== 'abajo') {
        errores.push({ codigo_orden, error: 'Debe definir posición de costura (arriba/abajo)' });
        continue;
      }

      if (pId === 5 && especificaciones &&
          typeof especificaciones.con_fuelle !== 'boolean') {
        errores.push({ codigo_orden, error: 'Debe definir si el saco lleva fuelle o es plano' });
        continue;
      }

      validadas.push(orden);
    }

    if (errores.length > 0) {
      const errorMsg = errores.map(e => `Orden ${e.codigo_orden}: ${e.error}`).join('; ');
      throw new ValidationError(`Errores de validación: ${errorMsg}`);
    }

    // Insertar en lotes de 50 para evitar timeout en SQLite con archivos grandes
    const BATCH_SIZE = 50;
    let guardadas = 0;

    for (let i = 0; i < validadas.length; i += BATCH_SIZE) {
      const lote = validadas.slice(i, i + BATCH_SIZE);

      await this.ordenProduccionRepository.db.withTransaction(async () => {
        for (const orden of lote) {
          await this.ordenProduccionRepository.create({
            codigo_orden:        orden.codigo_orden,
            producto:            orden.descripcion_producto,
            cantidad_objetivo:   orden.cantidad_planificada,
            fecha_planificada:   orden.fecha_vencimiento,
            unidad:              obtenerUnidadPorProceso(orden.proceso_id),
            prioridad:           orden.dias_atrasados > 0 ? 'Alta' : 'Media',
            observaciones:       orden.pedido_cliente
                                   ? `Pedido cliente: ${orden.pedido_cliente}`
                                   : '',
            estado:              'Creada',
            especificaciones: {
              ...orden.especificaciones,
              // Campos SAP adicionales para trazabilidad
              sap_serie:              orden.nombre_proceso_sap,
              sap_cantidad_completada: orden.cantidad_completada,
              sap_cantidad_pendiente:  orden.cantidad_pendiente,
              sap_dias_atrasados:      orden.dias_atrasados,
              sap_pedido_cliente:      orden.pedido_cliente,
              sap_fecha_pedido:        orden.fecha_pedido,
              sap_fecha_inicio:        orden.fecha_inicio,
              importado_por:           usuario,
              importado_en:            new Date().toISOString()
            },
            created_by: usuario
          });
          guardadas++;
        }
      });
    }

    return { guardadas, errores: [] };
  }
}

module.exports = OrdenProduccionService;
