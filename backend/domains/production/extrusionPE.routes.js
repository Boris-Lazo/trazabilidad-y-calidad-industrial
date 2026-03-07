const express = require('express');
const router = express.Router();

const ExtrusionPEService      = require('./extrusionPE.service');
const ExtrusionPERepository   = require('./extrusionPE.repository');
const ExtrusionPEController   = require('./extrusionPE.controller');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const LoteRepository          = require('../quality/lote.repository');
const LoteService             = require('../quality/lote.service');
const AuditRepository         = require('../../shared/audit/AuditRepository');
const AuditService            = require('../../shared/audit/AuditService');
const sqlite                  = require('../../database/sqlite');
const authorize               = require('../../middlewares/authorize');
const { PERMISSIONS }         = require('../../shared/auth/permissions');

// Instanciación
const extrusionPERepository   = new ExtrusionPERepository(sqlite);
const lineaEjecucionRepository = new LineaEjecucionRepository(sqlite);
const registroTrabajoRepository = new RegistroTrabajoRepository(sqlite);
const loteRepository          = new LoteRepository(sqlite);
const auditRepository         = new AuditRepository(sqlite);
const auditService            = new AuditService(auditRepository);
const loteService             = new LoteService(loteRepository, auditService);

const extrusionPEService = new ExtrusionPEService(
  extrusionPERepository,
  lineaEjecucionRepository,
  loteService,
  auditService
);

const ctrl = new ExtrusionPEController(extrusionPEService);

router.get('/detalle', authorize(PERMISSIONS.VIEW_PRODUCTION), ctrl.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_PRODUCTION), ctrl.saveDetalle);

module.exports = router;
