const express = require('express');
const router = express.Router();

const LinerPERepository       = require('./linerPE.repository');
const LinerPEService          = require('./linerPE.service');
const LinerPEController       = require('./linerPE.controller');
const LineaEjecucionRepository = require('../../execution/lineaEjecucion.repository');
const LoteRepository          = require('../../../quality/lote.repository');
const LoteService             = require('../../../quality/lote.service');
const AuditRepository         = require('../../../../shared/audit/AuditRepository');
const AuditService            = require('../../../../shared/audit/AuditService');
const sqlite                  = require('../../../../database/sqlite');
const authorize               = require('../../../../middlewares/authorize');
const { PERMISSIONS }         = require('../../../../shared/auth/permissions');

// Instanciación
const linerPERepo  = new LinerPERepository(sqlite);
const lineaRepo    = new LineaEjecucionRepository(sqlite);
const loteRepo     = new LoteRepository(sqlite);
const auditRepo    = new AuditRepository(sqlite);
const auditSvc     = new AuditService(auditRepo);
const loteService  = new LoteService(loteRepo, auditSvc);

const linerPEService    = new LinerPEService(
    linerPERepo, lineaRepo, loteService, auditSvc
);
const linerPEController = new LinerPEController(linerPEService);

// Endpoints
router.get('/detalle',
    authorize(PERMISSIONS.VIEW_PRODUCTION),
    linerPEController.getDetalle
);

router.post('/guardar',
    authorize(PERMISSIONS.MANAGE_PRODUCTION),
    linerPEController.guardarDetalle
);

module.exports = router;
