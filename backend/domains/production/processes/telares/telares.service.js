const BaseProcesoService = require('../base/BaseProcesoService');
const ValidationError = require('../../../../shared/errors/ValidationError');
const NotFoundError = require('../../../../shared/errors/NotFoundError');

class TelaresService extends BaseProcesoService {
  constructor(
    telaresRepository,
    lineaEjecucionRepository,
    registroTrabajoRepository,
    muestraRepository,
    loteService,
    paroService,
    auditService
  ) {
    // Base constructor: (repository, loteService, lineaEjecucionRepository, auditService, config)
    super(telaresRepository, loteService, lineaEjecucionRepository, auditService, {
      procesoId: 2
    });
    this.muestraRepository          = muestraRepository;
    this.paroService                = paroService;
  }

  async getResumen(bitacoraId) {
    const maquinas = await this.repository.getAllMaquinas();
    const statusMaquinas = await this.repository.getStatusMaquinas(bitacoraId);
    const registros = await this.repository.getRegistrosByBitacora(bitacoraId);
    const muestras = await this.repository.getMuestrasByBitacora(bitacoraId);
    const visuales = await this.repository.getDefectosVisuales(bitacoraId);

    return maquinas.map(m => {
      const mStatus = statusMaquinas.find(s => s.maquina_id === m.id);
      const mRegistros = registros.filter(r => r.maquina_id === m.id);
      const mMuestras = muestras.filter(mu => mu.maquina_id === m.id);
      const mVisuales = visuales.filter(v => v.maquina_id === m.id);

      const produccionTotal = mRegistros.reduce((acc, r) => acc + (r.cantidad_producida || 0), 0);
      const ordenActiva = mRegistros.length > 0 ? mRegistros[mRegistros.length - 1].codigo_orden : 'Sin orden';

      let tieneDesviacion = mMuestras.some(mu => mu.resultado === 'No cumple');
      let estado = mStatus ? mStatus.estado : 'Sin datos';

      return {
        id: m.id,
        codigo: m.codigo,
        ordenActiva,
        produccionTotal,
        estado,
        tieneAlertas: mVisuales.length > 0 || tieneDesviacion
      };
    });
  }

  async getDetalle(bitacoraId, maquinaId) {
    const maquinas = await this.repository.getAllMaquinas();
    const maquina = maquinas.find(m => m.id == maquinaId);
    if (!maquina) throw new NotFoundError('Máquina no encontrada');

    const statusMaquinas = await this.repository.getStatusMaquinas(bitacoraId);
    const mStatus = statusMaquinas.find(s => s.maquina_id == maquinaId);

    const registros = await this.repository.getRegistrosByBitacora(bitacoraId);
    const mRegistros = registros.filter(r => r.maquina_id == maquinaId);

    const muestras = await this.repository.getMuestrasByMaquina(bitacoraId, maquinaId);
    const visuales = await this.repository.getDefectosVisuales(bitacoraId);
    const mVisuales = visuales.filter(v => v.maquina_id == maquinaId);

    const paros = await this.paroService.getParosByProceso(bitacoraId, 2);

    const ultimoAcumulado = await this.repository.getUltimoAcumulado(maquinaId, bitacoraId);

    // Obtener especificaciones de la última orden registrada
    let specs = {};
    if (mRegistros.length > 0 && mRegistros[mRegistros.length - 1].especificaciones) {
        specs = JSON.parse(mRegistros[mRegistros.length - 1].especificaciones);
    }

    const lotesConsumidos = await this.loteService.getConsumoTelar(maquinaId, bitacoraId);

    return {
      maquina,
      estado: mStatus ? mStatus.estado : 'Sin datos',
      observacion_advertencia: mStatus ? mStatus.observacion_advertencia : '',
      ultimoAcumulado,
      lotes_consumidos: lotesConsumidos,
      produccion: mRegistros.map(r => {
          let acumulado = 0;
          try {
              acumulado = JSON.parse(r.parametros).acumulado_contador;
          } catch(e) {}
          return {
            id: r.id,
            orden_id: r.orden_id,
            codigo_orden: r.codigo_orden,
            acumulado_contador: acumulado,
            cantidad_producida: r.cantidad_producida,
            desperdicio_kg: r.merma_kg,
            observaciones: r.observaciones
          };
      }),
      calidad: {
        ancho: muestras.filter(m => m.parametro === 'ancho_tela').map(m => {
            let indice = 0;
            try { indice = JSON.parse(m.parametros).indice; } catch(e) {}
            return { id: m.id, indice, valor: m.valor, resultado: m.resultado, valor_nominal: m.valor_nominal };
        }),
        construccion: muestras.filter(m => m.parametro === 'construccion_urdido' || m.parametro === 'construccion_trama'),
        color: muestras.filter(m => m.parametro === 'color_urdido' || m.parametro === 'color_trama')
      },
      visual: mVisuales.map(v => ({
          id: v.id,
          rollo_numero: v.rollo_numero,
          tipo_defecto_id: v.tipo_defecto,
          tipo_defecto_nombre: v.tipo_defecto === 'DEF-01' ? 'Cintas incorrectas' : v.tipo_defecto === 'DEF-02' ? 'Tela picada' : 'Rollo mal embobinado',
          observacion: v.observacion,
          orden_id: v.orden_id,
          codigo_orden: v.codigo_orden
      })),
      paros: paros.map(p => ({
          id: p.id,
          motivo_id: p.motivo_id,
          motivo_nombre: p.motivo_nombre,
          minutos_perdidos: p.minutos_perdidos,
          observacion: p.observacion
      })),
      especificaciones_orden: {
          ancho_nominal: specs.ancho_nominal,
          construccion_urdido: specs.construccion_urdido,
          construccion_trama: specs.construccion_trama,
          color_urdido: specs.color_urdido,
          color_trama: specs.color_trama
      }
    };
  }

  async saveDetalle(data, usuario) {
    const { bitacora_id, maquina_id, produccion, calidad, visual, paros, observacion_advertencia, lotes_consumidos = [] } = data;

    // 1. Validaciones de dominio
    for (const p of paros) {
        if (p.minutos_perdidos <= 0) throw new ValidationError('Los minutos de paro deben ser mayores a 0.');
        if (!p.observacion || p.observacion.trim().length < 10) throw new ValidationError('La justificación del paro debe tener al menos 10 caracteres.');
    }

    for (const v of visual) {
        if (!v.observacion || v.observacion.trim().length < 10) throw new ValidationError('La observación del defecto visual debe tener al menos 10 caracteres.');
        if (!['DEF-01', 'DEF-02', 'DEF-03'].includes(v.tipo_defecto_id)) throw new ValidationError('ID de defecto visual inválido.');
    }

    const bitacora = await this.repository.getBitacoraById(bitacora_id);
    if (!bitacora) throw new NotFoundError('Bitácora no encontrada');

    function esResetAnual(acumuladoNuevo, acumuladoAnterior, bitacoraFecha) {
      if (acumuladoNuevo >= acumuladoAnterior) return false;
      const dateBitacora = new Date(bitacoraFecha);
      const añoBitacora = dateBitacora.getFullYear();
      const añoActual = new Date().getFullYear();
      const esNuevoAño = añoActual > añoBitacora;
      const esValorPequeño = acumuladoNuevo < (acumuladoAnterior * 0.1);
      return esNuevoAño && esValorPequeño;
    }

    const ultimoAcumuladoBase = await this.repository.getUltimoAcumulado(maquina_id, bitacora_id);
    let acumuladoReferencia = ultimoAcumuladoBase;

    for (const p of produccion) {
        if (p.acumulado_contador < acumuladoReferencia) {
            if (!esResetAnual(p.acumulado_contador, acumuladoReferencia, bitacora.fecha_apertura)) {
                throw new ValidationError(
                    `El acumulado (${p.acumulado_contador}) no puede ser menor al anterior ` +
                    `(${acumuladoReferencia}). Si es un reset de contador de año nuevo, ` +
                    `el nuevo valor debe ser menor al 10% del anterior.`
                );
            }
        }
        acumuladoReferencia = p.acumulado_contador;
    }

    const produccionTotal = produccion.reduce((acc, p, i) => {
        const anterior = (i === 0) ? ultimoAcumuladoBase : produccion[i-1].acumulado_contador;
        const diff = p.acumulado_contador - anterior;
        return acc + (diff >= 0 ? diff : p.acumulado_contador);
    }, 0);

    if (produccionTotal === 0 && paros.length === 0) {
        throw new ValidationError('Debe registrar al menos un paro si no hubo producción.');
    }

    if (calidad.ancho.length < 4 && (!observacion_advertencia || observacion_advertencia.trim().length === 0)) {
        throw new ValidationError('Debe justificar la omisión de mediciones de ancho.');
    }

    // Validación lotes consumidos
    if (produccionTotal > 0 && lotes_consumidos.length === 0) {
      throw new ValidationError(
        'Debe declarar al menos un lote consumido cuando ' +
        'hay producción registrada.'
      );
    }

    for (const lc of lotes_consumidos) {
      const lote = await this.loteService.getById(lc.lote_id);
      if (!lote) {
        throw new NotFoundError(`Lote ID ${lc.lote_id} no encontrado.`);
      }
      if (lote.estado === 'cerrado') {
        throw new ValidationError(
          `El lote ${lote.codigo_lote} está cerrado y no ` +
          `puede declararse como consumido.`
        );
      }
    }

    const colorNoCumple = calidad.color.some(c => c.resultado === 'No cumple');
    if (colorNoCumple && paros.length === 0) {
        throw new ValidationError('Un color fuera de especificación obliga a registrar un paro.');
    }

    const result = await this.repository.withTransaction(async () => {
      const procesoId = 2;

      // Guardar Producción (Idempotente)
      let refAcumulado = ultimoAcumuladoBase;
      const registroIds = [];
      for (const p of produccion) {
          let linea = await this.obtenerOCrearLineaEjecucion(p.orden_id, maquina_id);

          if (p.acumulado_contador < refAcumulado && esResetAnual(p.acumulado_contador, refAcumulado, bitacora.fecha_apertura)) {
              refAcumulado = 0;
          }

          const cantProd = p.acumulado_contador - refAcumulado;
          const regData = {
              cantidad_producida: cantProd,
              merma_kg: p.desperdicio_kg || 0,
              observaciones: p.observaciones || '',
              parametros: JSON.stringify({ acumulado_contador: p.acumulado_contador }),
              linea_ejecucion_id: linea.id,
              bitacora_id,
              maquina_id,
              usuario_modificacion: usuario
          };

          const existente = await this.repository.findByLineaYBitacoraYMaquina(linea.id, bitacora_id, maquina_id);

          let registroId;
          if (existente) {
              await this.repository.updateRegistro(existente.id, regData);
              registroId = existente.id;
          } else {
              registroId = await this.repository.saveRegistroTrabajo(regData);
          }

          registroIds.push(registroId);
          refAcumulado = p.acumulado_contador;
      }

      const ultimoRegistroId = registroIds.length > 0
        ? registroIds[registroIds.length - 1]
        : null;

      // Calidad y Visual solo se reemplazan si la bitácora está ABIERTA o REVISION
      if (['ABIERTA', 'REVISION'].includes(bitacora.estado)) {
          await this.repository.deleteMuestrasByMaquinaYBitacora(maquina_id, bitacora_id, procesoId);
          await this.repository.deleteDefectosVisualesByMaquinaYBitacora(maquina_id, bitacora_id);

          // Guardar Muestras Ancho
          for (const a of calidad.ancho) {
              await this.muestraRepository.create({
                  parametro: 'ancho_tela',
                  valor: a.valor,
                  resultado: a.resultado,
                  bitacora_id,
                  proceso_id: procesoId,
                  maquina_id,
                  valor_nominal: a.valor_nominal,
                  usuario_modificacion: usuario,
                  parametros: JSON.stringify({ indice: a.indice })
              });
          }

          // Guardar Muestras Construcción
          for (const c of calidad.construccion) {
              await this.muestraRepository.create({
                  parametro: c.parametro,
                  valor: c.valor,
                  resultado: c.resultado,
                  bitacora_id,
                  proceso_id: procesoId,
                  maquina_id,
                  valor_nominal: c.valor_nominal,
                  usuario_modificacion: usuario
              });
          }

          // Guardar Muestras Color
          for (const c of calidad.color) {
              await this.muestraRepository.create({
                  parametro: c.parametro,
                  valor: c.valor,
                  resultado: c.resultado,
                  bitacora_id,
                  proceso_id: procesoId,
                  maquina_id,
                  valor_nominal: c.valor_nominal,
                  usuario_modificacion: usuario
              });
          }

          // Guardar Visual
          for (const v of visual) {
              await this.repository.saveDefectoVisual({
                  bitacora_id,
                  maquina_id,
                  orden_id: v.orden_id,
                  rollo_numero: v.rollo_numero,
                  tipo_defecto: v.tipo_defecto_id,
                  observacion: v.observacion,
                  usuario_modificacion: usuario
              });
          }
      }

      // Guardar Paros vía ParoService
      for (const p of paros) {
          await this.paroService.create({
              bitacora_id,
              proceso_id: procesoId,
              motivo_id: p.motivo_id,
              minutos_perdidos: p.minutos_perdidos,
              observacion: p.observacion
          });
      }

      // Guardar Consumo de Lotes
      if (ultimoRegistroId) {
        await this.loteService.guardarConsumoTelar(
          maquina_id,
          bitacora_id,
          lotes_consumidos.map(lc => lc.lote_id),
          ultimoRegistroId,
          usuario
        );
      }

      // Calcular Estado Final
      let estadoFinal = 'Sin datos';
      const hasData = produccion.length > 0 || paros.length > 0 || calidad.ancho.length > 0 || calidad.construccion.length > 0 || calidad.color.length > 0;

      if (hasData) {
          estadoFinal = 'Parcial';

          const anchoOk = calidad.ancho.every(a => a.resultado === 'Cumple');
          const colorOk = calidad.color.every(c => c.resultado === 'Cumple');
          const desviacion = !anchoOk || !colorOk;

          const completo = (produccion.length > 0 || paros.length > 0) &&
                           (calidad.ancho.length >= 4 || (observacion_advertencia && observacion_advertencia.length > 0)) &&
                           (calidad.construccion.length === 2) &&
                           (calidad.color.length >= 2);

          if (completo) estadoFinal = 'Completo';
          if (desviacion) estadoFinal = 'Con desviación';
      }

      await this.actualizarEstado(bitacora_id, maquina_id, estadoFinal, observacion_advertencia);

      return { produccionTotal, registroIds };
    });

    // Auditoría
    await this.auditService.logChange({
        usuario,
        accion: 'SAVE_DETALLE_TELAR',
        entidad: 'RegistroTelar',
        entidad_id: maquina_id,
        valor_nuevo: {
            bitacora_id,
            maquina_id,
            produccion_total: result.produccionTotal,
            paros_count: paros.length,
            lotes_consumidos: lotes_consumidos.map(lc => lc.lote_id)
        },
        motivo_cambio: 'Guardado de detalle de telar por operario'
    });

    return result;
  }

  async getParoTipos() {
    return await this.repository.getParoTipos();
  }
}

module.exports = TelaresService;
