
const AppError = require('../../shared/errors/AppError');
const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

class TelaresService {
  constructor(telaresRepository, lineaEjecucionRepository, registroTrabajoRepository, muestraRepository) {
    this.telaresRepository = telaresRepository;
    this.lineaEjecucionRepository = lineaEjecucionRepository;
    this.registroTrabajoRepository = registroTrabajoRepository;
    this.muestraRepository = muestraRepository;
  }

  async getResumen(bitacoraId) {
    const maquinas = await this.telaresRepository.getAllMaquinas();
    const statusMaquinas = await this.telaresRepository.getStatusMaquinas(bitacoraId);
    const registros = await this.telaresRepository.getRegistrosByBitacora(bitacoraId);
    const muestras = await this.telaresRepository.getMuestrasByBitacora(bitacoraId);
    const visuales = await this.telaresRepository.getDefectosVisuales(bitacoraId);

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
    const maquinas = await this.telaresRepository.getAllMaquinas();
    const maquina = maquinas.find(m => m.id == maquinaId);
    if (!maquina) throw new NotFoundError('Máquina no encontrada');

    const statusMaquinas = await this.telaresRepository.getStatusMaquinas(bitacoraId);
    const mStatus = statusMaquinas.find(s => s.maquina_id == maquinaId);

    const registros = await this.telaresRepository.getRegistrosByBitacora(bitacoraId);
    const mRegistros = registros.filter(r => r.maquina_id == maquinaId);

    const muestras = await this.telaresRepository.getMuestrasByMaquina(bitacoraId, maquinaId);
    const visuales = await this.telaresRepository.getDefectosVisuales(bitacoraId);
    const mVisuales = visuales.filter(v => v.maquina_id == maquinaId);

    const paros = await this.telaresRepository.getParosByMaquina(bitacoraId, maquinaId);
    const ultimoAcumulado = await this.telaresRepository.getUltimoAcumulado(maquinaId, bitacoraId);

    // Obtener especificaciones de la última orden registrada
    let specs = {};
    if (mRegistros.length > 0 && mRegistros[mRegistros.length - 1].especificaciones) {
        specs = JSON.parse(mRegistros[mRegistros.length - 1].especificaciones);
    }

    return {
      maquina,
      estado: mStatus ? mStatus.estado : 'Sin datos',
      observacion_advertencia: mStatus ? mStatus.observacion_advertencia : '',
      ultimoAcumulado,
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
          paro_tipo_id: p.paro_tipo_id,
          tipo_nombre: p.tipo_nombre,
          minutos: p.minutos,
          justificacion: p.justificacion
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
    const { bitacora_id, maquina_id, produccion, calidad, visual, paros, observacion_advertencia } = data;

    // 1. Validaciones de dominio
    for (const p of paros) {
        if (p.minutos <= 0) throw new ValidationError('Los minutos de paro deben ser mayores a 0.');
        if (!p.justificacion || p.justificacion.trim().length < 10) throw new ValidationError('La justificación del paro debe tener al menos 10 caracteres.');
    }

    for (const v of visual) {
        if (!v.observacion || v.observacion.trim().length < 10) throw new ValidationError('La observación del defecto visual debe tener al menos 10 caracteres.');
        if (!['DEF-01', 'DEF-02', 'DEF-03'].includes(v.tipo_defecto_id)) throw new ValidationError('ID de defecto visual inválido.');
    }

    const ultimoAcumuladoBase = await this.telaresRepository.getUltimoAcumulado(maquina_id, bitacora_id);
    let acumuladoReferencia = ultimoAcumuladoBase;

    for (const p of produccion) {
        if (p.acumulado_contador < acumuladoReferencia) {
            // Aquí se podría chequear si es reset anual, pero por ahora seguimos la regla dura del prompt
            throw new ValidationError(`El acumulado (${p.acumulado_contador}) no puede ser menor al anterior (${acumuladoReferencia}).`);
        }
        acumuladoReferencia = p.acumulado_contador;
    }

    const produccionTotal = produccion.reduce((acc, p, i) => {
        const anterior = (i === 0) ? ultimoAcumuladoBase : produccion[i-1].acumulado_contador;
        return acc + (p.acumulado_contador - anterior);
    }, 0);

    if (produccionTotal === 0 && paros.length === 0) {
        throw new ValidationError('Debe registrar al menos un paro si no hubo producción.');
    }

    if (calidad.ancho.length < 4 && (!observacion_advertencia || observacion_advertencia.trim().length === 0)) {
        throw new ValidationError('Debe justificar la omisión de mediciones de ancho.');
    }

    const colorNoCumple = calidad.color.some(c => c.resultado === 'No cumple');
    if (colorNoCumple && paros.length === 0) {
        throw new ValidationError('Un color fuera de especificación obliga a registrar un paro.');
    }

    return await this.telaresRepository.withTransaction(async () => {
      const procesoId = 2;
      await this.telaresRepository.deleteMachineRecords(bitacora_id, maquina_id);

      // Guardar Producción
      let refAcumulado = ultimoAcumuladoBase;
      for (const p of produccion) {
          let linea = await this.lineaEjecucionRepository.findByOrdenAndProceso(p.orden_id, procesoId, maquina_id);
          if (!linea) {
              const resId = await this.lineaEjecucionRepository.create(p.orden_id, procesoId, maquina_id);
              linea = { id: resId };
          }

          const cantProd = p.acumulado_contador - refAcumulado;
          await this.registroTrabajoRepository.create({
              cantidad_producida: cantProd,
              merma_kg: p.desperdicio_kg || 0,
              observaciones: p.observaciones || '',
              parametros: JSON.stringify({ acumulado_contador: p.acumulado_contador }),
              linea_ejecucion_id: linea.id,
              bitacora_id,
              maquina_id,
              usuario_modificacion: usuario
          });
          refAcumulado = p.acumulado_contador;
      }

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
              valor: c.valor, // null o el valor si aplica, el prompt dice resultado cumple/no cumple
              resultado: c.resultado,
              bitacora_id,
              proceso_id: procesoId,
              maquina_id,
              valor_nominal: c.valor_nominal, // color esperado
              usuario_modificacion: usuario
          });
      }

      // Guardar Visual
      for (const v of visual) {
          await this.telaresRepository.saveDefectoVisual({
              bitacora_id,
              maquina_id,
              orden_id: v.orden_id,
              rollo_numero: v.rollo_numero,
              tipo_defecto: v.tipo_defecto_id,
              observacion: v.observacion,
              usuario_modificacion: usuario
          });
      }

      // Guardar Paros
      for (const p of paros) {
          await this.telaresRepository.saveParo({
              bitacora_id,
              maquina_id,
              paro_tipo_id: p.paro_tipo_id,
              minutos: p.minutos,
              justificacion: p.justificacion,
              usuario_modificacion: usuario
          });
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

      await this.telaresRepository.saveMaquinaStatus(bitacora_id, maquina_id, estadoFinal, observacion_advertencia);
    });
  }

  async getParoTipos() {
    return await this.telaresRepository.getParoTipos();
  }
}

module.exports = TelaresService;
