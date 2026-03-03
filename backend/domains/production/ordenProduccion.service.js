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

    // Validar que el archivo tenga la estructura esperada de SAP
    if (filas.length < 4) {
      throw new ValidationError(
        'El archivo no contiene datos. Verifique que sea el reporte de Órdenes de SAP.'
      );
    }

    // Validar encabezados en fila 2 (índice 2)
    const headers = filas[2] || [];
    if (!headers.includes('Series de documentos') || !headers.includes('Nº documento')) {
      throw new ValidationError(
        'El archivo no tiene el formato esperado de SAP. ' +
        'Asegúrese de exportar el reporte "Órdenes de Producción" desde SAP.'
      );
    }

    // Datos desde fila 3 (índice 3)
    const datos = filas.slice(3);
    const resultado = {
      total_filas: 0,
      nuevas: [],
      ya_existentes: [],
      no_reconocidas: [],
      requieren_validacion: 0
    };

    for (const filaArr of datos) {
      // Ignorar filas completamente vacías
      if (!filaArr || filaArr.every(c => c === null || c === '')) continue;

      // col[2] = Nº documento (7 dígitos)
      const codigoDoc = filaArr[2];
      if (!codigoDoc || !/^\d{7}$/.test(String(codigoDoc).trim())) continue;

      resultado.total_filas++;

      // slice(1) para que parsearFila reciba: [Serie, Nº doc, Descripción, ...]
      const ordenParseada = parsearFila(filaArr.slice(1), MAPEO_SAP);

      if (!ordenParseada.proceso_id) {
        resultado.no_reconocidas.push(ordenParseada);
        continue;
      }

      const existente = await this.ordenProduccionRepository.findByCodigoOrden(
        ordenParseada.codigo_orden
      );

      if (existente) {
        resultado.ya_existentes.push(ordenParseada.codigo_orden);
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
    const errores = [];
    const validadas = [];

    for (const orden of ordenes) {
      const { codigo_orden, proceso_id, cantidad_planificada, especificaciones } = orden;

      if (!/^\d{7}$/.test(String(codigo_orden))) {
        errores.push({ codigo_orden, error: 'Código de orden debe tener 7 dígitos' });
        continue;
      }

      const pId = parseInt(proceso_id);
      if (isNaN(pId) || pId < 1 || pId > 9) {
        errores.push({ codigo_orden, error: 'Proceso ID debe estar entre 1 y 9' });
        continue;
      }

      if (parseFloat(cantidad_planificada) <= 0) {
        errores.push({ codigo_orden, error: 'La cantidad planificada debe ser mayor a 0' });
        continue;
      }

      if (pId === 4 && (especificaciones.costura_posicion !== 'arriba' && especificaciones.costura_posicion !== 'abajo')) {
        errores.push({ codigo_orden, error: 'Debe definir posición de costura (arriba/abajo)' });
        continue;
      }

      if (pId === 5 && typeof especificaciones.con_fuelle !== 'boolean') {
        errores.push({ codigo_orden, error: 'Debe definir si el saco lleva fuelle o es plano' });
        continue;
      }

      validadas.push(orden);
    }

    if (errores.length > 0) {
      const errorMsg = errores.map(e => `Orden ${e.codigo_orden}: ${e.error}`).join('; ');
      throw new DomainError(`Errores de validación en la importación: ${errorMsg}`);
    }

    let guardadas = 0;
    const dbWrapper = this.ordenProduccionRepository.db;

    await dbWrapper.withTransaction(async () => {
      for (const orden of validadas) {
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

    return { guardadas, errores: [] };
  }
}

module.exports = OrdenProduccionService;
