// Servicio para gestión de bitácoras y registros operativos
const AppError = require('../../shared/errors/AppError');
const NotFoundError = require('../../shared/errors/NotFoundError');
const ValidationError = require('../../shared/errors/ValidationError');

class BitacoraService {
  /**
   * @param {BitacoraRepository} bitacoraRepository
   * @param {LineaEjecucionRepository} lineaEjecucionRepository
   * @param {RegistroTrabajoRepository} registroTrabajoRepository
   * @param {MuestraRepository} muestraRepository
   */
  constructor(bitacoraRepository, lineaEjecucionRepository, registroTrabajoRepository, muestraRepository) {
    this.bitacoraRepository = bitacoraRepository;
    this.lineaEjecucionRepository = lineaEjecucionRepository;
    this.registroTrabajoRepository = registroTrabajoRepository;
    this.muestraRepository = muestraRepository;
  }

  async getActiveBitacora() {
    return await this.bitacoraRepository.findActive();
  }

  async openBitacora(data) {
    const active = await this.bitacoraRepository.findActive();
    if (active) {
      throw new ValidationError('Ya existe una bitácora abierta para este turno.');
    }
    const id = await this.bitacoraRepository.create(data);
    return await this.bitacoraRepository.findById(id);
  }

  async closeBitacora(id, currentUser, userRol) {
    const bitacora = await this.bitacoraRepository.findById(id);
    if (!bitacora) {
      throw new NotFoundError('Bitácora no encontrada.');
    }

    if (bitacora.inspector !== currentUser && userRol !== 'ADMIN') {
      throw new AppError('Solo el inspector que abrió la bitácora puede cerrarla.', 403);
    }

    // Validaciones de cierre
    const procesos = await this.bitacoraRepository.getResumenProcesos();
    for (const proceso of procesos) {
        const registros = await this.bitacoraRepository.getRegistrosByProceso(id, proceso.id);
        const muestras = await this.bitacoraRepository.getMuestrasByProceso(id, proceso.id);

        const hasRechazo = muestras.some(m => m.resultado === 'Rechazo' || m.resultado === 'En espera');
        const hasIncidente = registros.some(r => r.observaciones && r.observaciones.toLowerCase().includes('incidente'));

        if (hasRechazo || hasIncidente) {
            const hasObservaciones = registros.some(r => r.observaciones && r.observaciones.length > 10);
            if (!hasObservaciones) {
                throw new ValidationError(`El proceso '${proceso.nombre}' tiene desviaciones o rechazos pero no se ha proporcionado una explicación en las observaciones.`);
            }
        }
    }

    await this.bitacoraRepository.close(id);
    return { message: 'Bitácora cerrada con éxito.' };
  }

  async getResumenProcesos(bitacoraId) {
      const procesos = await this.bitacoraRepository.getResumenProcesos();
      const resumen = [];

      for (const proceso of procesos) {
          const registros = await this.bitacoraRepository.getRegistrosByProceso(bitacoraId, proceso.id);
          const muestras = await this.bitacoraRepository.getMuestrasByProceso(bitacoraId, proceso.id);
          const status = await this.bitacoraRepository.getProcesoStatus(bitacoraId, proceso.id);

          let estado = '⚪ Sin datos';
          let ultimaActualizacion = '—';

          const hasRegistros = registros.length > 0;
          const hasMuestras = muestras.length > 0;
          const hasRechazo = muestras.some(m => m.resultado === 'Rechazo' || m.resultado === 'En espera');
          const hasIncidente = registros.some(r => r.observaciones && r.observaciones.toLowerCase().includes('incidente'));

          if (status && status.no_operativo) {
              estado = '🟢 Completo';
          } else if (hasRechazo || hasIncidente) {
              estado = '🔴 Revisión';
          } else if (hasRegistros && hasMuestras) {
              estado = '🟢 Completo';
          } else if (hasRegistros || hasMuestras) {
              estado = '🟡 Parcial';
          }

          const allDates = [
              ...registros.map(r => new Date(r.fecha_hora)),
              ...muestras.map(m => new Date(m.fecha_analisis))
          ].filter(d => !isNaN(d.getTime()));

          if (allDates.length > 0) {
              const latest = new Date(Math.max(...allDates));
              ultimaActualizacion = latest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          resumen.push({
              id: proceso.id,
              nombre: proceso.nombre,
              estado,
              ultimaActualizacion,
              accion: estado.includes('Sin datos') ? 'Registrar' : 'Continuar'
          });
      }
      return resumen;
  }

  async getProcesoData(bitacoraId, procesoId) {
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
              produccion.push({
                  maquina: params.maquina || '',
                  orden_id: r.orden_id,
                  cantidad: r.cantidad_producida,
                  unidad: r.unidad
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

      return {
          no_operativo: !!(status && status.no_operativo),
          motivo_no_operativo: status ? status.motivo_no_operativo : '',
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
      const { bitacora_id, proceso_id, no_operativo, motivo_no_operativo, produccion, desperdicio, observaciones, muestras, isExtrusorPP, muestras_estructuradas, parametros_operativos, mezcla, incidentes } = data;
      const db = this.bitacoraRepository.db;

      try {
          await db.beginTransaction();

          await this.bitacoraRepository.deleteProcesoData(bitacora_id, proceso_id);

          if (no_operativo) {
              await this.bitacoraRepository.saveProcesoStatus(bitacora_id, proceso_id, true, motivo_no_operativo);
              await db.commit();
              return;
          }

          let extraDataSaved = false;
          for (const p of (produccion || [])) {
              let linea = await this.lineaEjecucionRepository.findByOrdenAndProceso(p.orden_id, proceso_id);
              if (!linea) {
                  const resId = await this.lineaEjecucionRepository.create(p.orden_id, proceso_id);
                  linea = { id: resId };
              }

              const d = (desperdicio || []).find(di => di.orden_id == p.orden_id && di.maquina == p.maquina);
              const paramsObj = { maquina: p.maquina };

              if (isExtrusorPP && !extraDataSaved) {
                  Object.assign(paramsObj, { muestras_estructuradas, parametros_operativos, mezcla, incidentes });
                  extraDataSaved = true;
              }

              await this.registroTrabajoRepository.create({
                  cantidad_producida: p.cantidad,
                  merma_kg: d ? d.kg : 0,
                  observaciones,
                  parametros: JSON.stringify(paramsObj),
                  linea_ejecucion_id: linea.id,
                  bitacora_id
              });
          }

          if (muestras) {
              for (const m of muestras) {
                  await this.muestraRepository.create({
                      parametro: m.parametro,
                      valor: m.valor,
                      resultado: m.resultado,
                      bitacora_id,
                      proceso_tipo_id: proceso_id
                  });
              }
          }

          if (isExtrusorPP && !extraDataSaved) {
              await this.registroTrabajoRepository.create({
                  cantidad_producida: 0,
                  merma_kg: 0,
                  observaciones,
                  parametros: JSON.stringify({ muestras_estructuradas, parametros_operativos, mezcla, incidentes }),
                  bitacora_id
              });
          }

          await db.commit();
      } catch (error) {
          await db.rollback();
          throw error;
      }
  }

  async getInspectores() {
      return await this.bitacoraRepository.getInspectores();
  }
}

module.exports = BitacoraService;
