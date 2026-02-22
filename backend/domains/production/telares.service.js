
const AppError = require('../../shared/errors/AppError');
const ValidationError = require('../../shared/errors/ValidationError');

class TelaresService {
  constructor(telaresRepository, lineaEjecucionRepository, registroTrabajoRepository, muestraRepository, incidentesRepository) {
    this.telaresRepository = telaresRepository;
    this.lineaEjecucionRepository = lineaEjecucionRepository;
    this.registroTrabajoRepository = registroTrabajoRepository;
    this.muestraRepository = muestraRepository;
    this.incidentesRepository = incidentesRepository;
  }

  async getResumen(bitacoraId) {
    const maquinas = await this.telaresRepository.getAllMaquinas();
    const statusMaquinas = await this.telaresRepository.getStatusMaquinas(bitacoraId);
    const registros = await this.telaresRepository.getRegistrosByBitacora(bitacoraId);
    const muestras = await this.telaresRepository.getMuestrasByBitacora(bitacoraId);
    const visuales = await this.telaresRepository.getDefectosVisuales(bitacoraId);

    const resumen = maquinas.map(m => {
      const mStatus = statusMaquinas.find(s => s.maquina_id === m.id);
      const mRegistros = registros.filter(r => r.maquina_id === m.id);
      const mMuestras = muestras.filter(mu => mu.maquina_id === m.id);
      const mVisuales = visuales.filter(v => v.maquina_id === m.id);

      const produccionTotal = mRegistros.reduce((acc, r) => acc + (r.cantidad_producida || 0), 0);
      const ordenActiva = mRegistros.length > 0 ? mRegistros[mRegistros.length - 1].codigo_orden : 'Sin orden';

      // Calcular promedio de ancho y cumplimiento
      let promedioAncho = 0;
      let cumplimiento = 100;
      let tieneDesviacion = false;

      if (mMuestras.length > 0) {
        const anchos = mMuestras.filter(mu => mu.parametro === 'Ancho').map(mu => mu.valor);
        if (anchos.length > 0) {
          promedioAncho = anchos.reduce((acc, v) => acc + v, 0) / anchos.length;

          const dentroTolerancia = mMuestras.filter(mu => mu.parametro === 'Ancho' && mu.resultado === 'Cumple').length;
          cumplimiento = (dentroTolerancia / anchos.length) * 100;
          if (cumplimiento < 100) tieneDesviacion = true;
        }
      }

      const tieneAlertas = mVisuales.length > 0 || mRegistros.some(r => r.observaciones && r.observaciones.length > 0) || tieneDesviacion;

      let estado = mStatus ? mStatus.estado : 'Sin datos';
      if (estado === 'Completo' && tieneDesviacion) {
          estado = 'Con desviación';
      }

      return {
        id: m.id,
        codigo: m.codigo,
        ordenActiva,
        produccionTotal,
        promedioAncho: promedioAncho.toFixed(2),
        cumplimiento: cumplimiento.toFixed(0),
        estado,
        tieneAlertas
      };
    });

    return resumen;
  }

  async getDetalle(bitacoraId, maquinaId) {
    const maquinas = await this.telaresRepository.getAllMaquinas();
    const maquina = maquinas.find(m => m.id == maquinaId);
    if (!maquina) throw new Error('Máquina no encontrada');

    const statusMaquinas = await this.telaresRepository.getStatusMaquinas(bitacoraId);
    const mStatus = statusMaquinas.find(s => s.maquina_id == maquinaId);

    const registros = await this.telaresRepository.getRegistrosByBitacora(bitacoraId);
    const mRegistros = registros.filter(r => r.maquina_id == maquinaId);

    const muestras = await this.telaresRepository.getMuestrasByBitacora(bitacoraId);
    const mMuestras = muestras.filter(mu => mu.maquina_id == maquinaId);

    const visuales = await this.telaresRepository.getDefectosVisuales(bitacoraId);
    const mVisuales = visuales.filter(v => v.maquina_id == maquinaId);

    const allIncidentes = await this.telaresRepository.getIncidentesByBitacora(bitacoraId);
    const mIncidentes = allIncidentes.filter(i => i.maquina_id == maquinaId);

    return {
      maquina,
      estado: mStatus ? mStatus.estado : 'Sin datos',
      observacion_advertencia: mStatus ? mStatus.observacion_advertencia : '',
      produccion: mRegistros.map(r => ({
        id: r.id,
        orden_id: r.orden_id,
        codigo_orden: r.codigo_orden,
        cantidad: r.cantidad_producida,
        desperdicio: r.merma_kg,
        observaciones: r.observaciones,
        especificaciones: r.especificaciones ? JSON.parse(r.especificaciones) : {}
      })),
      calidad: {
        ancho: mMuestras.filter(m => m.parametro === 'Ancho'),
        visual: mVisuales
      },
      incidentes: mIncidentes
    };
  }

  async saveDetalle(data, usuario) {
    const { bitacora_id, maquina_id, estado, produccion, calidad, incidentes, observacion_advertencia } = data;

    // Validaciones de Negocio (Business Rules)
    for (const p of produccion) {
        if (p.cantidad < 0 || p.desperdicio < 0) {
            throw new ValidationError('La producción y el desperdicio no pueden ser negativos.');
        }
        if (p.cantidad == 0 && p.desperdicio > 0 && (!p.observaciones || p.observaciones.trim().length < 5)) {
            throw new ValidationError('Se requiere una observación detallada cuando hay desperdicio sin producción.');
        }
    }

    return await this.telaresRepository.withTransaction(async () => {
      const proceso = await this.telaresRepository.db.get("SELECT id FROM PROCESO_TIPO WHERE nombre = 'Telares'");
      const procesoId = proceso ? proceso.id : 2;

      await this.db_delete_machine_records(bitacora_id, maquina_id);

      // 3. Guardar Producción y Desperdicio
      for (const p of produccion) {
          let linea = await this.lineaEjecucionRepository.findByOrdenAndProceso(p.orden_id, procesoId, maquina_id);
          if (!linea) {
              const resId = await this.lineaEjecucionRepository.create(p.orden_id, procesoId, maquina_id);
              linea = { id: resId };
          }

          await this.registroTrabajoRepository.create({
              cantidad_producida: p.cantidad,
              merma_kg: p.desperdicio || 0,
              observaciones: p.observaciones || '',
              parametros: JSON.stringify({ maquina_id }),
              linea_ejecucion_id: linea.id,
              bitacora_id,
              maquina_id,
              usuario_modificacion: usuario
          });
      }

      // 4. Guardar Calidad Ancho
      let tieneDesviacion = false;
      for (const a of calidad.ancho) {
          if (a.resultado !== 'Cumple') tieneDesviacion = true;

          // Obtener nominal de la orden si es posible
          let nominal = a.valor_nominal;
          if (!nominal && produccion.length > 0) {
              const orden = await this.telaresRepository.db.get("SELECT especificaciones FROM orden_produccion WHERE id = ?", [produccion[0].orden_id]);
              if (orden && orden.especificaciones) {
                  const specs = JSON.parse(orden.especificaciones);
                  nominal = specs.ancho_nominal;
              }
          }

          await this.muestraRepository.create({
              parametro: 'Ancho',
              valor: a.valor,
              resultado: a.resultado,
              bitacora_id,
              proceso_tipo_id: procesoId,
              maquina_id,
              valor_nominal: nominal,
              usuario_modificacion: usuario
          });
      }

      // 5. Guardar Calidad Visual
      for (const v of calidad.visual) {
          if (!v.observacion || v.observacion.trim().length < 5) {
              throw new ValidationError('Las observaciones son obligatorias para cada defecto visual.');
          }
          await this.saveVisualDefect({
              bitacora_id,
              maquina_id,
              orden_id: v.orden_id,
              rollo_numero: v.rollo_numero,
              tipo_defecto: v.tipo_defecto,
              observacion: v.observacion,
              usuario_modificacion: usuario
          });
      }

      // 6. Guardar Incidentes
      for (const inc of incidentes) {
          if (!inc.motivo || inc.motivo.trim().length < 5) {
              throw new ValidationError('Se requiere un motivo detallado para cada paro registrado.');
          }
          await this.saveIncidente({
              titulo: `${inc.clasificacion}: Paro`,
              descripcion: `Tiempo: ${inc.tiempo} min. ${inc.motivo}`,
              severidad: 'Media',
              maquina_id,
              bitacora_id,
              usuario_modificacion: usuario
          });
      }

      // 7. Actualizar Estado de la Máquina
      let estadoFinal = estado;
      if (estado === 'Completo' && tieneDesviacion) {
          estadoFinal = 'Con desviación';
      }
      await this.telaresRepository.saveMaquinaStatus(bitacora_id, maquina_id, estadoFinal, observacion_advertencia);
    });
  }

  // Helpers
  async db_delete_machine_records(bitacoraId, maquinaId) {
      const db = this.telaresRepository.db;
      await db.run("DELETE FROM registros_trabajo WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
      await db.run("DELETE FROM muestras WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
      await db.run("DELETE FROM calidad_telares_visual WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
      await db.run("DELETE FROM incidentes WHERE bitacora_id = ? AND maquina_id = ?", [bitacoraId, maquinaId]);
  }

  async saveVisualDefect(data) {
      const { bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion } = data;
      await this.telaresRepository.db.run(
          "INSERT INTO calidad_telares_visual (bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
          [bitacora_id, maquina_id, orden_id, rollo_numero, tipo_defecto, observacion, usuario_modificacion]
      );
  }

  async saveIncidente(data) {
      const { titulo, descripcion, severidad, maquina_id, bitacora_id } = data;
      await this.telaresRepository.db.run(
          "INSERT INTO incidentes (titulo, descripcion, severidad, maquina_id, bitacora_id, fecha_creacion, estado) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'abierto')",
          [titulo, descripcion, severidad, maquina_id, bitacora_id]
      );
  }
}

module.exports = TelaresService;
