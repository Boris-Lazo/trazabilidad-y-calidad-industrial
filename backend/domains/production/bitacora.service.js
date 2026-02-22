// Servicio para gestión de bitácoras y registros operativos
const bitacoraRepository = require('./bitacora.repository');
const AppError = require('../../shared/errors/AppError');
const sqlite = require('../../database/sqlite');

const getActiveBitacora = async () => {
  return await bitacoraRepository.findActive();
};

const openBitacora = async (data) => {
  const active = await bitacoraRepository.findActive();
  if (active) {
    throw new AppError('Ya existe una bitácora abierta para este turno.', 400);
  }
  const id = await bitacoraRepository.create(data);
  return await bitacoraRepository.findById(id);
};

const closeBitacora = async (id, currentUser, userRol) => {
  const bitacora = await bitacoraRepository.findById(id);
  if (!bitacora) {
    throw new AppError('Bitácora no encontrada.', 404);
  }

  if (bitacora.inspector !== currentUser && userRol !== 'ADMIN') {
    throw new AppError('Solo el inspector que abrió la bitácora puede cerrarla.', 403);
  }

  // Validaciones de cierre
  const procesos = await bitacoraRepository.getResumenProcesos();
  for (const proceso of procesos) {
      const registros = await bitacoraRepository.getRegistrosByProceso(id, proceso.id);
      const muestras = await bitacoraRepository.getMuestrasByProceso(id, proceso.id);

      const hasRechazo = muestras.some(m => m.resultado === 'Rechazo' || m.resultado === 'En espera');
      const hasIncidente = registros.some(r => r.observaciones && r.observaciones.toLowerCase().includes('incidente'));

      if (hasRechazo || hasIncidente) {
          const hasObservaciones = registros.some(r => r.observaciones && r.observaciones.length > 10);
          if (!hasObservaciones) {
              throw new AppError(`El proceso '${proceso.nombre}' tiene desviaciones o rechazos pero no se ha proporcionado una explicación en las observaciones.`, 400);
          }
      }
  }

  await bitacoraRepository.close(id);
  return { message: 'Bitácora cerrada con éxito.' };
};

const getResumenProcesos = async (bitacoraId) => {
    const procesos = await bitacoraRepository.getResumenProcesos();
    const resumen = [];

    for (const proceso of procesos) {
        const registros = await bitacoraRepository.getRegistrosByProceso(bitacoraId, proceso.id);
        const muestras = await bitacoraRepository.getMuestrasByProceso(bitacoraId, proceso.id);
        const status = await bitacoraRepository.getProcesoStatus(bitacoraId, proceso.id);

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
};

const getProcesoData = async (bitacoraId, procesoId) => {
    const bitacora = await bitacoraRepository.findById(bitacoraId);
    if (!bitacora) throw new AppError('Bitácora no encontrada.', 404);

    const status = await bitacoraRepository.getProcesoStatus(bitacoraId, procesoId);
    const registros = await bitacoraRepository.getRegistrosByProceso(bitacoraId, procesoId);
    const muestras = await bitacoraRepository.getMuestrasByProceso(bitacoraId, procesoId);

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
};

const saveProcesoData = async (data) => {
    const { bitacora_id, proceso_id, no_operativo, motivo_no_operativo, produccion, desperdicio, observaciones, muestras, isExtrusorPP, muestras_estructuradas, parametros_operativos, mezcla, incidentes } = data;

    // Usar transacción simple o secuencial
    await bitacoraRepository.deleteProcesoData(bitacora_id, proceso_id);

    if (no_operativo) {
        await bitacoraRepository.saveProcesoStatus(bitacora_id, proceso_id, true, motivo_no_operativo);
        return;
    }

    let extraDataSaved = false;
    for (const p of (produccion || [])) {
        // Buscar o crear linea_ejecucion
        let linea = await sqlite.get('SELECT id FROM lineas_ejecucion WHERE orden_produccion_id = ? AND proceso_tipo_id = ?', [p.orden_id, proceso_id]);
        if (!linea) {
            const res = await sqlite.run('INSERT INTO lineas_ejecucion (orden_produccion_id, proceso_tipo_id, estado) VALUES (?, ?, ?)', [p.orden_id, proceso_id, 'activo']);
            linea = { id: res.lastID };
        }

        const d = (desperdicio || []).find(di => di.orden_id == p.orden_id && di.maquina == p.maquina);
        const paramsObj = { maquina: p.maquina };

        if (isExtrusorPP && !extraDataSaved) {
            Object.assign(paramsObj, { muestras_estructuradas, parametros_operativos, mezcla, incidentes });
            extraDataSaved = true;
        }

        await sqlite.run(`
            INSERT INTO registros_trabajo (cantidad_producida, merma_kg, observaciones, parametros, linea_ejecucion_id, bitacora_id, fecha_hora)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [p.cantidad, d ? d.kg : 0, observaciones, JSON.stringify(paramsObj), linea.id, bitacora_id]);
    }

    if (muestras) {
        for (const m of muestras) {
            await sqlite.run(`
                INSERT INTO muestras (parametro, valor, resultado, bitacora_id, proceso_tipo_id, fecha_analisis)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [m.parametro, m.valor, m.resultado, bitacora_id, proceso_id]);
        }
    }

    if (isExtrusorPP && !extraDataSaved) {
        await sqlite.run(`
            INSERT INTO registros_trabajo (cantidad_producida, merma_kg, observaciones, parametros, bitacora_id, fecha_hora)
            VALUES (0, 0, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [observaciones, JSON.stringify({ muestras_estructuradas, parametros_operativos, mezcla, incidentes }), bitacora_id]);
    }
};

module.exports = {
  getActiveBitacora,
  openBitacora,
  closeBitacora,
  getResumenProcesos,
  getProcesoData,
  saveProcesoData,
  getInspectores: bitacoraRepository.getInspectores
};
