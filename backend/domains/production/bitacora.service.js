// Servicio para gestión de bitácoras y registros operativos
const AppError = require('../../shared/errors/AppError');
const NotFoundError = require('../../shared/errors/NotFoundError');
const ValidationError = require('../../shared/errors/ValidationError');
const { ROLE_PERMISSIONS } = require('../../shared/auth/permissions');
const ProcessRegistry = require('./contracts/ProcessRegistry');

class BitacoraService {
  /**
   * @param {BitacoraRepository} bitacoraRepository
   * @param {LineaEjecucionRepository} lineaEjecucionRepository
   * @param {RegistroTrabajoRepository} registroTrabajoRepository
   * @param {MuestraRepository} muestraRepository
   * @param {AuditService} auditService
   * @param {ParoRepository} paroRepository
   * @param {PlanningService} planningService
   */
  constructor(bitacoraRepository, lineaEjecucionRepository, registroTrabajoRepository, muestraRepository, auditService, paroRepository, planningService) {
    this.bitacoraRepository = bitacoraRepository;
    this.lineaEjecucionRepository = lineaEjecucionRepository;
    this.registroTrabajoRepository = registroTrabajoRepository;
    this.muestraRepository = muestraRepository;
    this.auditService = auditService;
    this.paroRepository = paroRepository;
    this.planningService = planningService;
  }

  async getActiveBitacora() {
    return await this.bitacoraRepository.findActive();
  }

  async getMostRecentBitacora() {
    return await this.bitacoraRepository.findMostRecent();
  }

  async openBitacora(data) {
    const active = await this.bitacoraRepository.findActive();
    if (active) {
      throw new ValidationError('Ya existe una bitácora abierta para este turno.');
    }
    const id = await this.bitacoraRepository.create(data);
    return await this.bitacoraRepository.findById(id);
  }

  async calcularResumenTiempo(bitacoraId, procesoId) {
    const status = await this.bitacoraRepository.getProcesoStatus(bitacoraId, procesoId);
    const tiempoProgramado = status ? status.tiempo_programado_minutos : 480;
    const totalParos = await this.paroRepository.sumMinutosByBitacoraAndProceso(bitacoraId, procesoId);
    const tiempoEfectivo = tiempoProgramado - totalParos;

    return {
      tiempo_programado: tiempoProgramado,
      total_paros: totalParos,
      tiempo_efectivo: tiempoEfectivo
    };
  }

  async closeBitacora(id, currentUser, userRol) {
    const bitacora = await this._getBitacoraOrThrow(id);
    this._checkCloseAuthorization(bitacora, currentUser, userRol);

    const needsRevision = await this._validateProcesosParaCierre(id, bitacora);

    const nuevoEstado = needsRevision ? 'REVISION' : 'CERRADA';

    await this.bitacoraRepository.updateEstado(id, nuevoEstado);
    await this.auditService.logStatusChange(currentUser, 'Bitacora', id, bitacora.estado, nuevoEstado, 'Cierre de bitácora');

    return {
        message: nuevoEstado === 'REVISION'
            ? 'Bitácora enviada a REVISIÓN debido a desviaciones detectadas.'
            : 'Bitácora cerrada con éxito.',
        estado: nuevoEstado
    };
  }

  // --- Métodos Privados Extraídos ---

  async _getBitacoraOrThrow(id) {
    const bitacora = await this.bitacoraRepository.findById(id);
    if (!bitacora) {
      throw new NotFoundError('Bitácora no encontrada.');
    }

    if (bitacora.estado === 'CERRADA') {
        throw new ValidationError('La bitácora ya se encuentra cerrada.');
    }
    return bitacora;
  }

  _checkCloseAuthorization(bitacora, currentUser, userRol) {
    // Los roles con permiso para cerrar bitácoras de otros deben ser 'Administrador' y 'Supervisor'
    // Derivamos los nombres exactos de las llaves de ROLE_PERMISSIONS para evitar hardcoding frágil
    const roles = Object.keys(ROLE_PERMISSIONS);
    const adminRole = roles.find(r => r.toLowerCase().includes('admin'));
    const supervisorRole = roles.find(r => r.toLowerCase().includes('supervisor'));

    const isOwner = bitacora.inspector === currentUser;
    const canCloseOthers = userRol === adminRole || userRol === supervisorRole;

    if (!isOwner && !canCloseOthers) {
      throw new AppError('Solo el inspector que abrió la bitácora o un administrador pueden cerrarla.', 403);
    }
  }

  async _validateProcesosParaCierre(bitacoraId, bitacora) {
    let needsRevisionGlobal = false;
    const procesos = ProcessRegistry.getAll();

    for (const proceso of procesos) {
        const registros = await this.bitacoraRepository.getRegistrosByProceso(bitacoraId, proceso.processId);
        const muestras = await this.bitacoraRepository.getMuestrasByProceso(bitacoraId, proceso.processId);

        await this._validateProcesoPersonal(proceso, bitacora, registros, muestras);

        // Validar tiempos de paro antes de cerrar
        const resumenTiempos = await this.calcularResumenTiempo(bitacoraId, proceso.processId);
        if (resumenTiempos.total_paros > resumenTiempos.tiempo_programado) {
            throw new ValidationError(`El proceso '${proceso.nombre}' tiene un exceso de tiempo de paro (${resumenTiempos.total_paros} min) sobre el programado (${resumenTiempos.tiempo_programado} min).`);
        }
        if (resumenTiempos.tiempo_efectivo < 0) {
            throw new ValidationError(`El proceso '${proceso.nombre}' tiene un tiempo efectivo negativo.`);
        }

        const processNeedsRevision = this._checkNeedsRevision(muestras, registros);
        if (processNeedsRevision) {
            needsRevisionGlobal = true;
            this._validateObservacionesRequeridas(proceso, registros, muestras);
        }
    }
    return needsRevisionGlobal;
  }

  async _validateProcesoPersonal(proceso, bitacora, registros, muestras) {
    const status = await this.bitacoraRepository.getProcesoStatus(bitacora.id, proceso.processId);
    const isOperativo = !(status && status.no_operativo);
    const hasData = registros.length > 0 || muestras.length > 0;

    if (isOperativo && hasData) {
        // Verificar personal asignado
        const hasPersonnel = await this.bitacoraRepository.checkAssignmentsForProcess(proceso.processId, bitacora.turno);
        if (!hasPersonnel) {
            throw new ValidationError(`No se puede cerrar el turno: El proceso '${proceso.nombre}' tiene actividad pero no cuenta con personal asignado para el turno ${bitacora.turno}.`);
        }
    }
  }

  _checkNeedsRevision(muestras, registros) {
    // Detección de rechazo: campo estructurado
    const RESULTADOS_REVISION = ['Rechazo', 'No cumple', 'En espera'];
    const hasRechazo = muestras.some(m => RESULTADOS_REVISION.includes(m.resultado));

    // Detección de incidente: campo booleano estructurado (no texto libre)
    // El campo tiene_incidente no existe aún en registros_trabajo
    const hasIncidente = false; // TODO: implementar campo tiene_incidente en registros_trabajo

    return hasRechazo || hasIncidente;
  }

  _validateObservacionesRequeridas(proceso, registros, muestras) {
    const hasObservaciones = registros.some(r => r.observaciones && r.observaciones.length > 10);
    if (!hasObservaciones) {
        throw new ValidationError(`El proceso '${proceso.nombre}' tiene desviaciones o rechazos pero no se ha proporcionado una explicación en las observaciones.`);
    }
  }

  async getResumenProcesos(bitacoraId) {
    const bitacora = await this.bitacoraRepository.findById(bitacoraId);
    const procesos = ProcessRegistry.getAll();
    const resumen = [];

    for (const proceso of procesos) {
      const registros = await this.bitacoraRepository.getRegistrosByProceso(bitacoraId, proceso.processId);
      const muestras = await this.bitacoraRepository.getMuestrasByProceso(bitacoraId, proceso.processId);
      const status = await this.bitacoraRepository.getProcesoStatus(bitacoraId, proceso.processId);

      const contract = ProcessRegistry.get(proceso.processId);
      const muestrasMinimas = contract.frecuenciaMuestreo?.muestrasMinTurno || 1;

      let estadoProceso = 'SIN_DATOS';
      let siguienteAccion = 'REGISTRAR_CALIDAD';
      let accionesPermitidas = ['REGISTRAR_CALIDAD'];
      let bloqueos = [];

      const produccionTotal = registros.reduce((sum, r) => sum + (r.cantidad_producida || 0), 0);
      const hasRegistros = registros.length > 0;
      const hasMuestras = muestras.length >= muestrasMinimas;

      const RESULTADOS_REVISION = ['Rechazo', 'No cumple', 'En espera'];
      const hasRechazo = muestras.some(m => RESULTADOS_REVISION.includes(m.resultado));
      const hasIncidente = false; // TODO: implementar campo tiene_incidente en registros_trabajo

      if (status && status.no_operativo) {
        estadoProceso = 'COMPLETO';
        siguienteAccion = 'NINGUNA';
        accionesPermitidas = [];
      } else if (hasRechazo || hasIncidente) {
        estadoProceso = 'REVISION';
        siguienteAccion = 'CORREGIR_O_JUSTIFICAR';
        accionesPermitidas = ['REGISTRAR_CALIDAD', 'REGISTRAR_PRODUCCION', 'CORREGIR'];
      } else if (hasRegistros && hasMuestras) {
        estadoProceso = 'COMPLETO';
        siguienteAccion = 'NINGUNA';
        accionesPermitidas = ['REGISTRAR_CALIDAD', 'REGISTRAR_PRODUCCION'];
      } else if (!hasMuestras) {
        estadoProceso = 'ESPERANDO_CALIDAD';
        siguienteAccion = 'REGISTRAR_CALIDAD';
        accionesPermitidas = ['REGISTRAR_CALIDAD'];
        bloqueos = [`No se puede registrar producción hasta validar calidad (mínimo ${muestrasMinimas} muestras).`];
      } else if (!hasRegistros) {
        estadoProceso = 'ESPERANDO_PRODUCCION';
        siguienteAccion = 'REGISTRAR_PRODUCCION';
        accionesPermitidas = ['REGISTRAR_CALIDAD', 'REGISTRAR_PRODUCCION'];
      } else {
        estadoProceso = 'PARCIAL';
        siguienteAccion = 'COMPLETAR_DATOS';
        accionesPermitidas = ['REGISTRAR_CALIDAD', 'REGISTRAR_PRODUCCION'];
      }

      if (bitacora.estado === 'CERRADA') {
        estadoProceso = 'CERRADO';
        siguienteAccion = 'LECTURA';
        accionesPermitidas = [];
        bloqueos = ['El turno está CERRADO. No se permiten modificaciones.'];
      }

      let ultimaActualizacion = '—';
      const allDates = [
        ...registros.map(r => new Date(r.fecha_hora)),
        ...muestras.map(m => new Date(m.fecha_analisis))
      ].filter(d => !isNaN(d.getTime()));

      if (allDates.length > 0) {
        const latest = new Date(Math.max(...allDates));
        ultimaActualizacion = latest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      resumen.push({
        id: proceso.processId,
        nombre: proceso.nombre,
        estadoUI: this._mapEstadoToUI(estadoProceso),
        estadoProceso,
        siguienteAccion,
        accionesPermitidas,
        bloqueos,
        ultimaActualizacion,
        produccionTotal,
        calidadValidada: hasMuestras && !hasRechazo,
        unidad: contract.unidadProduccion
      });
    }
    return resumen;
  }

  _mapEstadoToUI(estado) {
    const map = {
      'SIN_DATOS': '⚪ Sin datos',
      'ESPERANDO_CALIDAD': '🟡 Esperando Calidad',
      'ESPERANDO_PRODUCCION': '🟡 Esperando Producción',
      'PARCIAL': '🟡 Parcial',
      'REVISION': '🔴 Revisión',
      'COMPLETO': '🟢 Completo'
    };
    return map[estado] || estado;
  }

  async getProcesoData(bitacoraId, procesoId, ultimoTurno = false) {
      if (ultimoTurno) {
          const lastBitacora = await this.bitacoraRepository.getLastClosedBitacoraWithData(procesoId);
          if (!lastBitacora) return { parametros_operativos: null, mezcla: [] };
          bitacoraId = lastBitacora.id;
      }

      const bitacora = await this.bitacoraRepository.findById(bitacoraId);
      if (!bitacora) throw new NotFoundError('Bitácora no encontrada.');

      const status = await this.bitacoraRepository.getProcesoStatus(bitacoraId, procesoId);
      const registros = await this.bitacoraRepository.getRegistrosByProceso(bitacoraId, procesoId);
      const muestras = await this.bitacoraRepository.getMuestrasByProceso(bitacoraId, procesoId);

      const produccion = [];
      const desperdicio = [];
      let observaciones = '';
      let muestras_estructuradas = [];
      let parametros_operativos = null;
      let mezcla = [];
      let incidentes = [];

      registros.forEach(r => {
          let params = {};
          try { params = JSON.parse(r.parametros) || {}; } catch(e) {}

          if (params.muestras_estructuradas) muestras_estructuradas = params.muestras_estructuradas;
          if (params.parametros_operativos) parametros_operativos = params.parametros_operativos;
          if (params.mezcla) mezcla = params.mezcla;
          if (params.incidentes) incidentes = params.incidentes;

          if (r.orden_id) {
              const contract = ProcessRegistry.get(procesoId);
              produccion.push({
                  maquina: params.maquina || '',
                  orden_id: r.orden_id,
                  cantidad: r.cantidad_producida,
                  unidad: contract.unidadProduccion
              });
              if (r.merma_kg > 0) {
                  desperdicio.push({
                      maquina: params.maquina || '',
                      orden_id: r.orden_id,
                      kg: r.merma_kg
                  });
              }
          }
          if (r.observaciones) observaciones = r.observaciones;
      });

      if (produccion.length === 0 && registros.length > 0) {
          observaciones = registros[0].observaciones;
      }

      if (ultimoTurno) {
          return {
              parametros_operativos,
              mezcla
          };
      }

      // HERENCIA DE PLANIFICACIÓN
      let planData = null;
      if (this.planningService && !ultimoTurno) {
          planData = await this.planningService.getPlanningForShift(bitacora.fecha_operativa, bitacora.turno, procesoId);
      }

      return {
          no_operativo: !!(status && status.no_operativo),
          motivo_no_operativo: status ? status.motivo_no_operativo : '',
          planificado: planData,
          muestras,
          produccion,
          desperdicio,
          observaciones,
          muestras_estructuradas,
          parametros_operativos,
          mezcla,
          incidentes,
          solo_lectura: bitacora.estado === 'CERRADA'
      };
  }

  async saveProcesoData(data) {
      const { bitacora_id, proceso_id, no_operativo, motivo_no_operativo, produccion, desperdicio, observaciones, muestras, isExtrusorPP, muestras_estructuradas, parametros_operativos, mezcla, incidentes, usuario } = data;

      const bitacora = await this.bitacoraRepository.findById(bitacora_id);
      if (!bitacora) throw new NotFoundError('Bitácora no encontrada.');
      if (bitacora.estado === 'CERRADA') {
          throw new ValidationError('No se pueden modificar datos de una bitácora cerrada.');
      }

      const oldData = await this.getProcesoData(bitacora_id, proceso_id);

      return await this.bitacoraRepository.withTransaction(async () => {
          // Ya no usamos deleteProcesoData de forma destructiva.
          // En su lugar, actualizamos o insertamos.
          // Para simplificar la arquitectura sin cambiar el frontend,
          // realizamos un "soft-sync":

          if (no_operativo) {
              await this.bitacoraRepository.updateProcesoStatus(bitacora_id, proceso_id, true, motivo_no_operativo);
              await this.auditService.logUpdate(usuario, 'BitacoraProcesoStatus', bitacora_id, oldData, { no_operativo: true, motivo_no_operativo }, 'Marcado como no operativo');
              return;
          } else {
              await this.bitacoraRepository.updateProcesoStatus(bitacora_id, proceso_id, false, null);
          }

          let extraDataSaved = false;

          // Procesar producción
          for (const p of (produccion || [])) {
              let linea = await this.lineaEjecucionRepository.findByOrdenAndProceso(p.orden_id, proceso_id, p.maquina_id);
              if (!linea) {
                  const resId = await this.lineaEjecucionRepository.create(p.orden_id, proceso_id, p.maquina_id);
                  linea = { id: resId };
              }

              const d = (desperdicio || []).find(di => di.orden_id == p.orden_id && di.maquina == p.maquina);
              const paramsObj = { maquina: p.maquina };

              if (isExtrusorPP && !extraDataSaved) {
                  Object.assign(paramsObj, { muestras_estructuradas, parametros_operativos, mezcla, incidentes });
                  extraDataSaved = true;
              }

              const existingRegistro = await this.bitacoraRepository.getRegistroByLineaYBitacora(linea.id, bitacora_id, p.maquina_id);

              const registroData = {
                  cantidad_producida: p.cantidad,
                  merma_kg: d ? d.kg : 0,
                  observaciones,
                  parametros: JSON.stringify(paramsObj),
                  linea_ejecucion_id: linea.id,
                  bitacora_id,
                  maquina_id: p.maquina_id,
                  usuario_modificacion: usuario
              };

              if (existingRegistro) {
                  await this.registroTrabajoRepository.update(existingRegistro.id, registroData);
              } else {
                  await this.registroTrabajoRepository.create(registroData);
              }
          }

          // Validar unidades y parámetros según contrato
          const contract = ProcessRegistry.get(proceso_id);
          for (const p of (produccion || [])) {
              if (p.unidad && !contract.validaUnidad(p.unidad)) {
                  throw new ValidationError(`Unidad '${p.unidad}' no válida para el proceso ${contract.nombre}. Se esperaba ${contract.unidadProduccion}.`);
              }
          }

          // Para Muestras, dado que no tienen un identificador único claro desde el frontend,
          // mantenemos el reemplazo en la tabla pero LO REGISTRAMOS en la auditoría.
          // Una arquitectura superior requeriría IDs para cada muestra.
          if (muestras && muestras.length > 0) {
              await this.bitacoraRepository.deleteMuestrasByProceso(bitacora_id, proceso_id);
              for (const m of muestras) {
                  const valParam = contract.validarParametro(m.parametro, m.valor);
                  if (!valParam.valido) {
                      throw new ValidationError(`Validación de parámetro fallida: ${valParam.error}`);
                  }

                  await this.muestraRepository.create({
                      parametro: m.parametro,
                      valor: m.valor,
                      resultado: m.resultado,
                      bitacora_id,
                      proceso_id: proceso_id,
                      usuario_modificacion: usuario
                  });
              }
          }

          if (isExtrusorPP && !extraDataSaved) {
              await this.registroTrabajoRepository.create({
                  cantidad_producida: 0,
                  merma_kg: 0,
                  observaciones,
                  parametros: JSON.stringify({ muestras_estructuradas, parametros_operativos, mezcla, incidentes }),
                  bitacora_id,
                  usuario_modificacion: usuario
              });
          }

          await this.auditService.logUpdate(usuario, 'BitacoraProceso', bitacora_id, oldData, data, 'Actualización de registros de producción y calidad');
      });
  }

  async getInspectores() {
      return await this.bitacoraRepository.getInspectores();
  }
}

module.exports = BitacoraService;
