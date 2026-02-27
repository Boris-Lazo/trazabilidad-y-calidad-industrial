// Rutas para bitácora con Inyección de Dependencias manual
const express = require('express');
const BitacoraRepository = require('./bitacora.repository');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const MuestraRepository = require('./muestra.repository');
const ParoRepository = require('./paro.repository');
const BitacoraService = require('./bitacora.service');
const BitacoraController = require('./bitacora.controller');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');
const AuditRepository = require('../../shared/audit/AuditRepository');
const AuditService = require('../../shared/audit/AuditService');

// Instanciación manual
const bitacoraRepository = new BitacoraRepository(sqlite);
const lineaEjecucionRepository = new LineaEjecucionRepository(sqlite);
const registroTrabajoRepository = new RegistroTrabajoRepository(sqlite);
const muestraRepository = new MuestraRepository(sqlite);
const paroRepository = new ParoRepository(sqlite);
const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);

const bitacoraService = new BitacoraService(
    bitacoraRepository,
    lineaEjecucionRepository,
    registroTrabajoRepository,
    muestraRepository,
    auditService,
    paroRepository
);

const bitacoraController = new BitacoraController(bitacoraService);

const router = express.Router();

router.get('/estado', bitacoraController.getEstadoActual);
router.get('/procesos', bitacoraController.getProcesos);
router.post('/abrir', authorize(PERMISSIONS.MANAGE_QUALITY), bitacoraController.abrirBitacora);
router.post('/:id/cerrar', authorize(PERMISSIONS.MANAGE_QUALITY), bitacoraController.cerrarBitacora);
router.get('/tiempo-actual', bitacoraController.getTiempoActual);
router.get('/proceso-data', bitacoraController.getProcesoData);
router.post('/guardar-proceso', authorize(PERMISSIONS.MANAGE_PRODUCTION), bitacoraController.guardarProcesoData);
router.get('/inspectores', bitacoraController.getInspectores);
router.get('/resumen-tiempo', bitacoraController.getResumenTiempo);

module.exports = router;
