// Controlador para gestión de bitácoras de turno
const bitacoraService = require('./bitacora.service');
const { getTurnoActual } = require('./turno.utils');

const getEstadoActual = async (req, res, next) => {
  try {
    const bitacora = await bitacoraService.getActiveBitacora();
    if (!bitacora) {
      return res.json({ abierta: false });
    }
    const procesos = await bitacoraService.getResumenProcesos(bitacora.id);
    res.json({
      abierta: true,
      bitacora,
      procesos
    });
  } catch (error) {
    next(error);
  }
};

const abrirBitacora = async (req, res, next) => {
  try {
    const inspector = req.user.nombre || req.user.username;
    const { turno, fechaOperativa } = getTurnoActual();

    const now = new Date();
    const hours = now.getHours();
    let fueraDeHorario = false;
    if (turno === 'T1' && (hours < 7 || hours >= 15)) fueraDeHorario = true;
    if (turno === 'T2' && (hours < 15 || hours >= 23)) fueraDeHorario = true;
    if (turno === 'T3' && (hours >= 7 && hours < 23)) fueraDeHorario = true;

    const bitacora = await bitacoraService.openBitacora({
      turno,
      fecha_operativa: fechaOperativa,
      inspector,
      fuera_de_horario: fueraDeHorario
    });

    res.status(201).json(bitacora);
  } catch (error) {
    next(error);
  }
};

const cerrarBitacora = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUser = req.user.nombre || req.user.username;
    const result = await bitacoraService.closeBitacora(id, currentUser, req.user.rol);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getTiempoActual = async (req, res, next) => {
    try {
        const now = new Date();
        const { turno, fechaOperativa } = getTurnoActual(now);
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        res.json({
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

const getProcesoData = async (req, res, next) => {
    try {
        const { bitacora_id, proceso_id } = req.query;
        if (!bitacora_id || !proceso_id) throw new Error('Faltan parámetros.');
        const data = await bitacoraService.getProcesoData(bitacora_id, proceso_id);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

const guardarProcesoData = async (req, res, next) => {
    try {
        await bitacoraService.saveProcesoData(req.body);
        res.json({ message: 'Datos guardados correctamente.' });
    } catch (error) {
        next(error);
    }
};

const getInspectores = async (req, res, next) => {
    try {
        const inspectores = await bitacoraService.getInspectores();
        res.json(inspectores);
    } catch (error) {
        next(error);
    }
};

module.exports = {
  getEstadoActual,
  abrirBitacora,
  cerrarBitacora,
  getTiempoActual,
  getProcesoData,
  guardarProcesoData,
  getInspectores
};
