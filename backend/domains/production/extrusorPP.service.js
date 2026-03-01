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
    // Para simplificar y no añadir más dependencias, usaremos el loteService que ya tiene acceso indirecto o el repository.
    // Pero el prompt dice que loteService tiene findOrdenCodigo.
    const codigoOrden = await this.loteService.loteRepository.findOrdenCodigo(orden_id);
    if (!codigoOrden) {
        throw new ValidationError(`La orden ID ${orden_id} no existe.`);
    }
    if (!codigoOrden.startsWith('1')) {
        throw new ValidationError(`La orden ${codigoOrden} no pertenece al proceso de Extrusión PP.`);
    }

    // Verificar estado de la orden
    const orden = await this.loteService.loteRepository.findOrdenById(orden_id);
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
        const resultadosMuestras = [];
        for (const m of muestras) {
            // Calcular tenacidad
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

            resultadosMuestras.push({
                ...m,
                tenacidad,
                resultado_tenacidad: resultadoTenacidad
            });
        }

        // d. Generar/obtener lote
        const fechaHoy = new Date().toISOString().split('T')[0];
        const lote = await this.loteService.generarOObtenerLote(orden_id, bitacora_id, fechaHoy, usuario);

        // e. Calcular estado del proceso
        // Muestras del turno completo (pueden ser las que acabamos de insertar + las previas)
        const todasMuestras = await this.extrusorPPRepository.getMuestras(bitacora_id);
        // Agrupar muestras por 'momento' (esto requiere que guardemos el momento en algún lugar o lo deduzcamos)
        // El prompt sugiere que el estado depende de tener 3 muestras (inicio, mitad, dos_horas_antes)
        // Dado que el esquema de muestras no tiene 'momento', usaremos la cantidad de sets de muestras.
        // Un set tiene 5 parámetros (denier, resistencia, elongacion, ancho_cinta, tenacidad).
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

        // f. Guardar estado en BITACORA_PROCESO
        await this.extrusorPPRepository.saveEstadoProceso(bitacora_id, estadoProceso, produccion.observaciones || '', usuario);

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
    const estadoProceso = await this.extrusorPPRepository.getEstadoProceso(bitacoraId);
    const ultimoRegistro = await this.extrusorPPRepository.getUltimoRegistro(bitacoraId, maquina.id);
    const muestras = await this.extrusorPPRepository.getMuestras(bitacoraId);

    // Obtener lote activo para esta bitácora
    // Como el extrusor solo tiene una orden a la vez (normalmente), o queremos la última
    let lote = null;
    if (ultimoRegistro) {
        const le = await this.lineaEjecucionRepository.findById(ultimoRegistro.linea_ejecucion_id);
        if (le) {
            lote = await this.loteService.loteRepository.findByBitacoraYOrden(bitacoraId, le.orden_produccion_id);
        }
    }

    return {
        maquina,
        estado_proceso: estadoProceso ? (estadoProceso.no_operativo ? 'No operativo' : 'Operativo') : 'Sin datos',
        ultimo_registro: ultimoRegistro,
        muestras: muestras,
        lote: lote
    };
  }
}

module.exports = ExtrusorPPService;
