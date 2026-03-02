const express = require('express');
const router = express.Router();

const VestidosRepository       = require('./vestidos.repository');
const VestidosService          = require('./vestidos.service');
const VestidosController       = require('./vestidos.controller');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const LoteRepository           = require('../quality/lote.repository');
const LoteService              = require('../quality/lote.service');
const AuditRepository          = require('../../shared/audit/AuditRepository');
const AuditService             = require('../../shared/audit/AuditService');
const sqlite                   = require('../../database/sqlite');
const authorize                = require('../../middlewares/authorize');
const { PERMISSIONS }          = require('../../shared/auth/permissions');

// Instanciación de dependencias
const vestidosRepo = new VestidosRepository(sqlite);
const lineaRepo    = new LineaEjecucionRepository(sqlite);
const registroRepo = new RegistroTrabajoRepository(sqlite);
const loteRepo     = new LoteRepository(sqlite);
const auditRepo    = new AuditRepository(sqlite);
const auditSvc     = new AuditService(auditRepo);
const loteService  = new LoteService(loteRepo, auditSvc);

const vestidosService    = new VestidosService(
  vestidosRepo, lineaRepo, registroRepo, loteService
);
const vestidosController = new VestidosController(vestidosService);

// Endpoints
router.get('/detalle',
    authorize(PERMISSIONS.VIEW_PRODUCTION),
    vestidosController.getDetalle
);

router.post('/guardar',
    authorize(PERMISSIONS.MANAGE_PRODUCTION),
    vestidosController.guardarDetalle
);

module.exports = router;
