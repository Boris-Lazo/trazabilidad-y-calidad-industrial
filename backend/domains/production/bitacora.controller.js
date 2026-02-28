// Controlador para gestión de bitácoras de turno
const { sendSuccess } = require('../../shared/response/responseHandler');
const { getTurnoActual } = require('./turno.utils');
const ValidationError = require('../../shared/errors/ValidationError');

class BitacoraController {
  /**
   * @param {BitacoraService} bitacoraService
   */
  constructor(bitacoraService) {
    this.bitacoraService = bitacoraService;
  }

  getEstadoActual = async (req, res, next) => {
    try {
      let bitacora = await this.bitacoraService.getActiveBitacora();

      // Si no hay activa, buscar la más reciente (por si está CERRADA)
      if (!bitacora) {
          bitacora = await this.bitacoraService.getMostRecentBitacora();
      }

      if (!bitacora) {
        return sendSuccess(res, {
          abierta: false,
          estadoTurno: 'SIN_TURNO',
          siguienteAccion: 'ABRIR_TURNO',
          accionesPermitidas: ['ABRIR_TURNO'],
          bloqueos: ['No hay un turno activo. Debe abrir una bitácora para comenzar.'],
          puedeCerrarTurno: false
        });
      }

      const procesos = await this.bitacoraService.getResumenProcesos(bitacora.id);

      let estadoTurno = 'EN_PROCESO';
      let siguienteAccion = 'IR_A_PROCESO';
      let accionesPermitidas = ['IR_A_PROCESO'];
      let bloqueos = [];
      let puedeCerrarTurno = false;
      let razonesBloqueoCierre = [];

      const todosListos = procesos.every(p =>
        p.estadoProceso === 'COMPLETO' || p.estadoProceso === 'REVISION'
      );

      const resumenCierre = procesos.map(p => ({
          nombre: p.nombre,
          produccion: p.produccionTotal,
          unidad: p.unidad,
          calidadValidada: p.calidadValidada,
          estado: p.estadoProceso
      }));

      if (bitacora.estado === 'CERRADA') {
        estadoTurno = 'CERRADO';
        siguienteAccion = 'NINGUNA';
        accionesPermitidas = [];
        bloqueos = ['El turno ha sido cerrado y es inmutable.'];
      } else if (todosListos) {
        estadoTurno = 'LISTO_PARA_CIERRE';
        siguienteAccion = 'CERRAR_TURNO';
        accionesPermitidas = ['CERRAR_TURNO', 'IR_A_PROCESO'];
        puedeCerrarTurno = true;
      } else {
        const pendiente = procesos.find(p => p.estadoProceso !== 'COMPLETO' && p.estadoProceso !== 'REVISION');
        estadoTurno = 'EN_PROCESO';
        siguienteAccion = 'IR_A_PROCESO';
        const actionPayload = {
            proceso_id: pendiente.id,
            proceso_nombre: pendiente.nombre
        };
        razonesBloqueoCierre = [`Existen procesos pendientes: ${pendiente.nombre}`];

        return sendSuccess(res, {
          abierta: true,
          bitacora,
          procesos,
          estadoTurno,
          siguienteAccion,
          actionPayload,
          accionesPermitidas,
          bloqueos,
          puedeCerrarTurno,
          razonesBloqueoCierre
        });
      }

      return sendSuccess(res, {
        abierta: true,
        bitacora,
        procesos,
        estadoTurno,
        siguienteAccion,
        resumenCierre,
        accionesPermitidas,
        bloqueos,
        puedeCerrarTurno,
        razonesBloqueoCierre
      });
    } catch (error) {
      next(error);
    }
  };

  getProcesos = async (req, res, next) => {
    try {
      const procesos = await this.bitacoraService.getResumenProcesos();
      return sendSuccess(res, procesos);
    } catch (error) {
      next(error);
    }
  };

  abrirBitacora = async (req, res, next) => {
    try {
      const inspector = req.user.nombre || req.user.username;
      const { turno, fechaOperativa } = getTurnoActual();

      const now = new Date();
      const hours = now.getHours();
      let fueraDeHorario = false;
      if (turno === 'T1' && (hours < 7 || hours >= 15)) fueraDeHorario = true;
      if (turno === 'T2' && (hours < 15 || hours >= 23)) fueraDeHorario = true;
      if (turno === 'T3' && (hours >= 7 && hours < 23)) fueraDeHorario = true;

      const bitacora = await this.bitacoraService.openBitacora({
        turno,
        fecha_operativa: fechaOperativa,
        inspector,
        fuera_de_horario: fueraDeHorario
      });

      return sendSuccess(res, bitacora, 201);
    } catch (error) {
      next(error);
    }
  };

  cerrarBitacora = async (req, res, next) => {
    try {
      const { id } = req.params;
      const currentUser = req.user.nombre || req.user.username;
      const result = await this.bitacoraService.closeBitacora(id, currentUser, req.user.rol);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getTiempoActual = async (req, res, next) => {
      try {
          const now = new Date();
          const { turno, fechaOperativa } = getTurnoActual(now);
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          return sendSuccess(res, {
              hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              fecha: now.toLocaleDateString(),
              turno,
              fechaOperativa,
              timezone
          });
      } catch (error) {
          next(error);
      }
  };

  getProcesoData = async (req, res, next) => {
      try {
          const { bitacora_id, proceso_id, ultimo_turno } = req.query;
          if (!ultimo_turno && (!bitacora_id || !proceso_id)) throw new ValidationError('Faltan parámetros.');
          if (ultimo_turno && !proceso_id) throw new ValidationError('Falta proceso_id para obtener último turno.');

          const data = await this.bitacoraService.getProcesoData(bitacora_id, proceso_id, ultimo_turno === 'true');
          return sendSuccess(res, data);
      } catch (error) {
          next(error);
      }
  };

  guardarProcesoData = async (req, res, next) => {
      try {
          await this.bitacoraService.saveProcesoData({
              ...req.body,
              usuario: req.user.nombre || req.user.username
          });
          return sendSuccess(res, { message: 'Datos guardados correctamente.' });
      } catch (error) {
          next(error);
      }
  };

  getInspectores = async (req, res, next) => {
      try {
          const inspectores = await this.bitacoraService.getInspectores();
          return sendSuccess(res, inspectores);
      } catch (error) {
          next(error);
      }
  };

  getResumenTiempo = async (req, res, next) => {
      try {
          const { bitacora_id, proceso_id } = req.query;
          if (!bitacora_id || !proceso_id) throw new ValidationError('Faltan parámetros bitacora_id y proceso_id.');
          const resumen = await this.bitacoraService.calcularResumenTiempo(bitacora_id, proceso_id);
          return sendSuccess(res, resumen);
      } catch (error) {
          next(error);
      }
  };
}

module.exports = BitacoraController;
