const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');
const logger = require('../../shared/logger/logger');

class ExtrusorPPService {
  constructor(extrusorPPRepository, loteService, lineaEjecucionRepository, auditService) {
    this.extrusorPPRepository = extrusorPPRepository;
    this.loteService = loteService;
    this.lineaEjecucionRepository = lineaEjecucionRepository;
    this.auditService = auditService;
  }

  async saveDetalle(data, usuario) {
    const {
      bitacora_id,
      orden_id,
      produccion,
      muestras,
      parametros_operativos
    } = data;

    const procesoId = 1;

    // 1. Validar orden: verificar que orden_id existe, que su código empieza por 1 y que su estado no es Cancelada.
    // Usamos el repository local para cumplir con la arquitectura.
    const codigoOrden = await this.extrusorPPRepository.findOrdenCodigo(orden_id);
    if (!codigoOrden) {
        throw new ValidationError(`La orden ID ${orden_id} no existe.`);
    }
    if (!codigoOrden.startsWith('1')) {
        throw new ValidationError(`La orden ${codigoOrden} no pertenece al proceso de Extrusión PP.`);
    }

    const orden = await this.extrusorPPRepository.getOrdenById(orden_id);
    if (orden && orden.estado === 'Cancelada') {
        throw new ValidationError(`La orden ${codigoOrden} está cancelada.`);
    }

    // 2. Obtener máquina
    const maquina = await this.extrusorPPRepository.getMaquina();

    // 3. Calcular producción
    const ultimoRegistroTurno = await this.extrusorPPRepository.getUltimoRegistro(bitacora_id, maquina.id);
    let ultimoAcumulado;

    if (ultimoRegistroTurno) {
        ultimoAcumulado = JSON.parse(ultimoRegistroTurno.parametros).acumulado_contador;
    } else {
        ultimoAcumulado = await this.extrusorPPRepository.getUltimoAcumuladoHistorico(maquina.id, bitacora_id);
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
    return await this.extrusorPPRepository.withTransaction(async () => {
        // a. Obtener/crear linea_ejecucion
        let linea = await this.lineaEjecucionRepository.findByOrdenAndProceso(orden_id, procesoId, maquina.id);
        if (!linea) {
            const lineaId = await this.lineaEjecucionRepository.create(orden_id, procesoId, maquina.id);
            linea = { id: lineaId };
        }

        // b. Guardar registros_trabajo
        const parametrosJSON = {
            acumulado_contador: produccion.acumulado_contador,
            ...parametros_operativos
        };

        const registro_id = await this.extrusorPPRepository.saveRegistroTrabajo({
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
                await this.extrusorPPRepository.saveMuestra({
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
        const fechaHoy = new Date().toISOString().split('T')[0];
        const lote = await this.loteService.generarOObtenerLote(orden_id, bitacora_id, fechaHoy, usuario);

        // e. Calcular estado del proceso
        const todasMuestras = await this.extrusorPPRepository.getMuestras(bitacora_id);
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
        await this.extrusorPPRepository.saveEstadoMaquina(bitacora_id, maquina.id, estadoProceso, produccion.observaciones || '');

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
    const maquina = await this.extrusorPPRepository.getMaquina();
    const statusMaquina = await this.extrusorPPRepository.getEstadoMaquina(bitacoraId, maquina.id);
    const ultimoRegistro = await this.extrusorPPRepository.getUltimoRegistro(bitacoraId, maquina.id);
    const muestras = await this.extrusorPPRepository.getMuestras(bitacoraId);

    let lote = null;
    if (ultimoRegistro) {
        const le = await this.lineaEjecucionRepository.findById(ultimoRegistro.linea_ejecucion_id);
        if (le) {
            lote = await this.loteService.loteRepository.findByBitacoraYOrden(bitacoraId, le.orden_produccion_id);
        }
    }

    return {
        maquina,
        estado_proceso: statusMaquina ? statusMaquina.estado : 'Sin datos',
        ultimo_registro: ultimoRegistro,
        muestras: muestras,
        lote: lote
    };
  }
}

module.exports = ExtrusorPPService;
