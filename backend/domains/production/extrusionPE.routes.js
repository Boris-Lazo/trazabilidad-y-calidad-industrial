const express = require('express');
const router  = express.Router();

const ExtrusionPEController  = require('./extrusionPE.controller');
const ExtrusionPEService     = require('./extrusionPE.service');
const ExtrusionPERepository  = require('./extrusionPE.repository');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const LoteRepository         = require('../quality/lote.repository');
const LoteService            = require('../quality/lote.service');
const AuditRepository        = require('../../shared/audit/AuditRepository');
const AuditService           = require('../../shared/audit/AuditService');
const db                     = require('../../database/sqlite');
const authorize              = require('../../middlewares/authorize');
const { PERMISSIONS }        = require('../../shared/auth/permissions');

// Dependencias
const extrusionPERepository    = new ExtrusionPERepository(db);
const lineaEjecucionRepository = new LineaEjecucionRepository(db);
const loteRepository           = new LoteRepository(db);
const auditRepository          = new AuditRepository(db);
const auditService             = new AuditService(auditRepository);
const loteService              = new LoteService(loteRepository, auditService);

const extrusionPEService = new ExtrusionPEService(
    extrusionPERepository,
    lineaEjecucionRepository,
    loteService
);

const ctrl = new ExtrusionPEController(extrusionPEService);

// Endpoints
router.get('/detalle',   authorize(PERMISSIONS.VIEW_PRODUCTION),   ctrl.getDetalle);
router.post('/guardar',  authorize(PERMISSIONS.MANAGE_PRODUCTION),  ctrl.guardarDetalle);

module.exports = router;