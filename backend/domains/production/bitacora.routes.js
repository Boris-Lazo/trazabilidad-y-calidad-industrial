// Rutas para bitácora con Inyección de Dependencias manual
const express = require('express');
const BitacoraRepository = require('./bitacora.repository');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const MuestraRepository = require('./muestra.repository');
const BitacoraService = require('./bitacora.service');
const BitacoraController = require('./bitacora.controller');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const AuditRepository = require('../../shared/audit/AuditRepository');
const AuditService = require('../../shared/audit/AuditService');

// Instanciación manual
const bitacoraRepository = new BitacoraRepository(sqlite);
const lineaEjecucionRepository = new LineaEjecucionRepository(sqlite);
const registroTrabajoRepository = new RegistroTrabajoRepository(sqlite);
const muestraRepository = new MuestraRepository(sqlite);
const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);

const bitacoraService = new BitacoraService(
    bitacoraRepository,
    lineaEjecucionRepository,
    registroTrabajoRepository,
    muestraRepository,
    auditService
);

const bitacoraController = new BitacoraController(bitacoraService);

const router = express.Router();

router.get('/estado', bitacoraController.getEstadoActual);
router.post('/abrir', authorize('ADMIN', 'INSPECTOR'), bitacoraController.abrirBitacora);
router.post('/:id/cerrar', authorize('ADMIN', 'INSPECTOR'), bitacoraController.cerrarBitacora);
router.get('/tiempo-actual', bitacoraController.getTiempoActual);
router.get('/proceso-data', bitacoraController.getProcesoData);
router.post('/guardar-proceso', authorize('ADMIN', 'INSPECTOR', 'OPERACIONES'), bitacoraController.guardarProcesoData);
router.get('/inspectores', bitacoraController.getInspectores);

module.exports = router;
