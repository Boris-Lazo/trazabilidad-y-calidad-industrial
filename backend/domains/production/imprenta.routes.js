const express = require('express');
const router = express.Router();

const ImprentaRepository       = require('./imprenta.repository');
const ImprentaService          = require('./imprenta.service');
const ImprentaController       = require('./imprenta.controller');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const LoteRepository           = require('../quality/lote.repository');
const LoteService              = require('../quality/lote.service');
const AuditRepository          = require('../../shared/audit/AuditRepository');
const AuditService             = require('../../shared/audit/AuditService');
const sqlite                   = require('../../database/sqlite');
const authorize                = require('../../middlewares/authorize');
const { PERMISSIONS }          = require('../../shared/auth/permissions');

// Instanciación
const imprentaRepo = new ImprentaRepository(sqlite);
const lineaRepo    = new LineaEjecucionRepository(sqlite);
const registroRepo = new RegistroTrabajoRepository(sqlite);
const loteRepo     = new LoteRepository(sqlite);
const auditRepo    = new AuditRepository(sqlite);
const auditSvc     = new AuditService(auditRepo);
const loteService  = new LoteService(loteRepo, auditSvc);

const imprentaService    = new ImprentaService(
    imprentaRepo, lineaRepo, registroRepo, loteService, auditSvc
);
const imprentaController = new ImprentaController(imprentaService);

// Endpoints
router.get('/detalle/:maquinaId',
    authorize(PERMISSIONS.VIEW_PRODUCTION),
    imprentaController.getDetalle
);

router.post('/guardar',
    authorize(PERMISSIONS.MANAGE_PRODUCTION),
    imprentaController.guardarDetalle
);

module.exports = router;
