// Rutas para bitácora con Inyección de Dependencias manual
const express = require('express');
const BitacoraRepository = require('./bitacora.repository');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const MuestraRepository = require('./muestra.repository');
const BitacoraService = require('./bitacora.service');
const BitacoraController = require('./bitacora.controller');
const sqlite = require('../../database/sqlite');

// Instanciación manual
const bitacoraRepository = new BitacoraRepository(sqlite);
const lineaEjecucionRepository = new LineaEjecucionRepository(sqlite);
const registroTrabajoRepository = new RegistroTrabajoRepository(sqlite);
const muestraRepository = new MuestraRepository(sqlite);

const bitacoraService = new BitacoraService(
    bitacoraRepository,
    lineaEjecucionRepository,
    registroTrabajoRepository,
    muestraRepository
);

const bitacoraController = new BitacoraController(bitacoraService);

const router = express.Router();

router.get('/estado-actual', bitacoraController.getEstadoActual);
router.post('/abrir', bitacoraController.abrirBitacora);
router.post('/:id/cerrar', bitacoraController.cerrarBitacora);
router.get('/tiempo', bitacoraController.getTiempoActual);
router.get('/proceso-data', bitacoraController.getProcesoData);
router.post('/guardar-proceso', bitacoraController.guardarProcesoData);
router.get('/inspectores', bitacoraController.getInspectores);

module.exports = router;
