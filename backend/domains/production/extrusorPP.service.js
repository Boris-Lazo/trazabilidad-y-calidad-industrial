const BaseProcesoService = require('./base/BaseProcesoService');
const ValidationError = require('../../shared/errors/ValidationError');

class ExtrusorPPService extends BaseProcesoService {
  constructor(extrusorPPRepository, loteService, lineaEjecucionRepository, auditService) {
    super(extrusorPPRepository, loteService, lineaEjecucionRepository, auditService, {
      procesoId: 1,
      digitoOrden: '1'
    });
  }

  async saveDetalle(data, usuario) {
    const {
      bitacora_id,
      orden_id,
      produccion,
      muestras,
      parametros_operativos
    } = data;

    const procesoId = this.config.procesoId;

    // 1. Validar orden
    await this.validarOrden(orden_id);

    // 2. Obtener máquina
    const maquina = await this.repository.getMaquina();

    // 3. Calcular producción
    const ultimoRegistroTurno = await this.repository.getUltimoRegistro(bitacora_id, maquina.id);
    let ultimoAcumulado;

    if (ultimoRegistroTurno) {
        ultimoAcumulado = JSON.parse(ultimoRegistroTurno.parametros).acumulado_contador;
    } else {
        ultimoAcumulado = await this.repository.getUltimoAcumuladoHistorico(maquina.id, bitacora_id);
    }

    const cantidad_producida = produccion.acumulado_contador - (ultimoAcumulado || 0);
    if (cantidad_producida < 0) {
        throw new ValidationError('El acumulado no puede ser menor al anterior.');
    }

    // 5. Validar materias primas
    if (parametros_operativos.materias_primas && parametros_operativos.materias_primas.length > 0) {
        const sumaPorcentajes = parametros_operativos.materias_primas.reduce((acc, mp) => acc + (mp.porcentaje || 0), 0);
        if (Math.abs(sumaPorcentajes - 100) > 0.01) {
            throw new ValidationError('La suma de porcentajes de materias primas debe ser 100%.');
        }
    }

    // 6. Ejecutar en transacción
    return await this.repository.withTransaction(async () => {
        // a. Obtener/crear linea_ejecucion
        const linea = await this.obtenerOCrearLineaEjecucion(orden_id, maquina.id);

        // b. Guardar registros_trabajo
        const parametrosJSON = {
            acumulado_contador: produccion.acumulado_contador,
            ...parametros_operativos
        };

        const registro_id = await this.repository.saveRegistroTrabajo({
            linea_ejecucion_id: linea.id,
            bitacora_id,
            maquina_id: maquina.id,
            cantidad_producida,
            merma_kg: produccion.desperdicio_kg || 0,
            observaciones: produccion.observaciones || '',
            parametros: parametrosJSON,
            usuario_modificacion: usuario
        });

        // c. Para cada muestra, calcular tenacidad y guardar
        for (const m of muestras) {
            let tenacidad = null;
            let resultadoTenacidad = null;
            if (m.denier > 0 && m.resistencia > 0) {
                tenacidad = (m.resistencia * 1000) / m.denier;
                resultadoTenacidad = (tenacidad >= 4.5 && tenacidad <= 5.5) ? 'Cumple' : 'No cumple';
            }

            const parametrosMuestra = [
                { p: 'denier', v: m.denier, r: m.resultado_denier },
                { p: 'resistencia', v: m.resistencia, r: m.resultado_resistencia },
                { p: 'elongacion', v: m.elongacion, r: m.resultado_elongacion },
                { p: 'ancho_cinta', v: m.ancho_cinta, r: m.resultado_ancho_cinta }
            ];

            if (tenacidad !== null) {
                parametrosMuestra.push({ p: 'tenacidad', v: tenacidad, r: resultadoTenacidad });
            }

            for (const pm of parametrosMuestra) {
                await this.repository.saveMuestra({
                    bitacora_id,
                    proceso_id: procesoId,
                    maquina_id: maquina.id,
                    parametro: pm.p,
                    valor: pm.v,
                    resultado: pm.r,
                    usuario_modificacion: usuario
                });
            }
        }

        // d. Generar/obtener lote
        const lote = await this.generarLote(orden_id, bitacora_id, usuario);

        // e. Calcular estado del proceso
        const todasMuestras = await this.repository.getMuestras(bitacora_id);
        const numSets = Math.floor(todasMuestras.length / 5);

        let estadoProceso = 'Parcial';
        if (numSets === 0 && cantidad_producida === 0) {
            estadoProceso = 'Sin datos';
        } else if (numSets >= 3) {
            estadoProceso = 'Completo';
        }

        const tieneDesviacion = todasMuestras.some(m => m.resultado === 'No cumple');
        if (tieneDesviacion) {
            estadoProceso = 'Con desviación';
        }

        // f. Guardar estado real en bitacora_maquina_status
        await this.actualizarEstado(bitacora_id, maquina.id, estadoProceso, produccion.observaciones || '');

        return {
            registro_id,
            lote: {
                id: lote.id,
                codigo_lote: lote.codigo_lote
            },
            estado_proceso: estadoProceso
        };
    });
  }

  async getDetalle(bitacoraId) {
    const baseDetalle = await super.getDetalle(bitacoraId);
    const muestras = await this.repository.getMuestras(bitacoraId);

    return {
        ...baseDetalle,
        muestras: muestras
    };
  }
}

module.exports = ExtrusorPPService;
