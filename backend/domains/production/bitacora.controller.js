// Controlador para gestión de bitácoras de turno
const { sendSuccess } = require('../../shared/response/responseHandler');
const { getTurnoActual } = require('./turno.utils');

class BitacoraController {
  /**
   * @param {BitacoraService} bitacoraService
   */
  constructor(bitacoraService) {
    this.bitacoraService = bitacoraService;
  }

  getEstadoActual = async (req, res, next) => {
    try {
      const bitacora = await this.bitacoraService.getActiveBitacora();
      if (!bitacora) {
        return sendSuccess(res, { abierta: false });
      }
      const procesos = await this.bitacoraService.getResumenProcesos(bitacora.id);
      return sendSuccess(res, {
        abierta: true,
        bitacora,
        procesos
      });
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
          const { bitacora_id, proceso_id } = req.query;
          if (!bitacora_id || !proceso_id) throw new Error('Faltan parámetros.');
          const data = await this.bitacoraService.getProcesoData(bitacora_id, proceso_id);
          return sendSuccess(res, data);
      } catch (error) {
          next(error);
      }
  };

  guardarProcesoData = async (req, res, next) => {
      try {
          await this.bitacoraService.saveProcesoData(req.body);
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
}

module.exports = BitacoraController;
