// Servicio para órdenes de producción
const XLSX = require('xlsx');
const { parsearFila } = require('./ordenProduccion.parser');
const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

const MAPEO_SAP = {
  'ExtruPP': 1,
  'Telar': 2,
  'Laminado': 3,
  'Imprenta': 4,
  'ConverSA': 5,
  'ExtruPE': 6,
  'ConverLI': 7,
  'Peletiza': 8,
  'VestidoM': 9
};

// Mapeo inverso: proceso_id → unidad de medida por defecto
const UNIDAD_POR_PROCESO = {
  1: 'KG',   // ExtruPP
  2: 'M2',   // Telar
  3: 'M2',   // Laminado
  4: 'MIL',  // Imprenta
  5: 'UND',  // ConverSA
  6: 'KG',   // ExtruPE
  7: 'UND',  // ConverLI
  8: 'KG',   // Peletiza
  9: 'UND'   // VestidoM
};

function obtenerUnidadPorProceso(procesoId) {
  return UNIDAD_POR_PROCESO[parseInt(procesoId)] || 'UND';
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

  async procesarImportacionExcel(buffer, usuario) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // El rango del sheet SAP es B3:L114 — XLSX.js lee desde la primera celda del rango.
    // filas[0] = encabezados ('Series de documentos', 'Nº documento', ...)
    // filas[1..N] = datos de órdenes
    // filaArr[0] = Serie SAP, filaArr[1] = Nº documento (sin columna A vacía)
    if (filas.length < 2) {
      throw new ValidationError(
        'El archivo no contiene datos. Verifique que sea el reporte de Órdenes de SAP.'
      );
    }

    // Validar encabezados en fila índice 0
    const headers = filas[0] || [];
    if (!headers.includes('Series de documentos') || !headers.includes('Nº documento')) {
      throw new ValidationError(
        'El archivo no tiene el formato esperado de SAP. ' +
        'Columnas requeridas: "Series de documentos" y "Nº documento". ' +
        'Asegúrese de exportar el reporte de Órdenes de Producción desde SAP.'
      );
    }

    // Datos desde fila índice 1
    const datos = filas.slice(1);

    const resultado = {
      total_filas_excel: 0,
      nuevas: [],
      ya_existentes: [],
      no_reconocidas: [],
      requieren_validacion: 0
    };

    for (const filaArr of datos) {
      // Ignorar filas completamente vacías
      if (!filaArr || filaArr.every(c => c === null || c === '')) continue;

      // filaArr[1] = Nº documento (7 dígitos numéricos)
      const codigoDoc = filaArr[1];
      if (!codigoDoc || !/^\d{7}$/.test(String(codigoDoc).trim())) continue;

      resultado.total_filas_excel++;

      // filaArr[0]=Serie SAP, filaArr[1]=Nº doc — parsearFila espera este orden
      const ordenParseada = parsearFila(filaArr, MAPEO_SAP);

      if (!ordenParseada.proceso_id) {
        resultado.no_reconocidas.push({
          codigo_orden: ordenParseada.codigo_orden,
          nombre_proceso_sap: ordenParseada.nombre_proceso_sap,
          descripcion_producto: ordenParseada.descripcion_producto,
          motivo: `Serie SAP desconocida: "${ordenParseada.nombre_proceso_sap}".`
        });
        continue;
      }

      const existente = await this.ordenProduccionRepository.findByCodigoOrden(
        ordenParseada.codigo_orden
      );

      if (existente) {
        resultado.ya_existentes.push({
          codigo_orden: existente.codigo_orden,
          estado_prodsys: existente.estado,
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

    const omitidas = [];
    const validadas = [];

    for (const orden of ordenes) {
      const { codigo_orden, proceso_id, cantidad_planificada } = orden;

      // Validar código de orden
      if (!/^\d{7}$/.test(String(codigo_orden))) {
        omitidas.push({ codigo_orden, motivo: 'Código de orden inválido (debe tener 7 dígitos)' });
        continue;
      }

      // Validar proceso_id
      const pId = parseInt(proceso_id);
      if (isNaN(pId) || pId < 1 || pId > 9) {
        omitidas.push({ codigo_orden, motivo: `Proceso ID inválido: ${proceso_id}` });
        continue;
      }

      // Validar cantidad: acepta negativos (sobreproducción SAP) y cero
      const cantNum = parseFloat(cantidad_planificada);
      if (isNaN(cantNum)) {
        omitidas.push({ codigo_orden, motivo: 'Cantidad planificada no es un número válido' });
        continue;
      }

      // Verificar que no exista ya en PROD-SYS (puede haberse creado entre previsualizar y confirmar)
      const existente = await this.ordenProduccionRepository.findByCodigoOrden(codigo_orden);
      if (existente) {
        omitidas.push({ codigo_orden, motivo: 'Ya existe en PROD-SYS (creada entre previsualizar y confirmar)' });
        continue;
      }

      validadas.push(orden);
    }

    // Si no hay nada válido para guardar, informar
    if (validadas.length === 0) {
      throw new ValidationError(
        `No hay órdenes válidas para importar. ` +
        `Omitidas: ${omitidas.map(o => o.codigo_orden).join(', ')}`
      );
    }

    // Insertar en lotes de 50
    const BATCH_SIZE = 50;
    let guardadas = 0;

    for (let i = 0; i < validadas.length; i += BATCH_SIZE) {
      const lote = validadas.slice(i, i + BATCH_SIZE);
      await this.ordenProduccionRepository.db.withTransaction(async () => {
        for (const orden of lote) {
          await this.ordenProduccionRepository.create({
            codigo_orden:      orden.codigo_orden,
            producto:          orden.descripcion_producto,
            cantidad_objetivo: orden.cantidad_planificada,
            fecha_planificada: orden.fecha_vencimiento,
            unidad:            obtenerUnidadPorProceso(orden.proceso_id),
            prioridad:         (orden.dias_atrasados > 0) ? 'Alta' : 'Media',
            observaciones:     orden.pedido_cliente
                                 ? `Pedido cliente: ${orden.pedido_cliente}`
                                 : '',
            estado:            'Creada',
            especificaciones: {
              ...orden.especificaciones,
              sap_serie:               orden.nombre_proceso_sap,
              sap_cantidad_completada: orden.cantidad_completada,
              sap_cantidad_pendiente:  orden.cantidad_pendiente,
              sap_dias_atrasados:      orden.dias_atrasados,
              sap_pedido_cliente:      orden.pedido_cliente,
              sap_fecha_pedido:        orden.fecha_pedido,
              sap_fecha_inicio:        orden.fecha_inicio,
              importado_por:           usuario,
              importado_en:            new Date().toISOString()
            }
          });
          guardadas++;
        }
      });
    }

    return { guardadas, omitidas };
  }
}

module.exports = OrdenProduccionService;
