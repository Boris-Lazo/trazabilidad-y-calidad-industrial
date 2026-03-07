const express = require('express');
const router = express.Router();
const ExtrusorPPController = require('./extrusorPP.controller');
const ExtrusorPPService = require('./extrusorPP.service');
const ExtrusorPPRepository = require('./extrusorPP.repository');
const LineaEjecucionRepository = require('../../execution/lineaEjecucion.repository');
const LoteRepository = require('../../../quality/lote.repository');
const LoteService = require('../../../quality/lote.service');
const AuditService = require('../../../../shared/audit/AuditService');
const AuditRepository = require('../../../../shared/audit/AuditRepository');
const db = require('../../../../database/sqlite');
const authorize = require('../../../../middlewares/authorize');
const { PERMISSIONS } = require('../../../../shared/auth/permissions');

// Instanciación de dependencias
const extrusorPPRepository = new ExtrusorPPRepository(db);
const lineaEjecucionRepository = new LineaEjecucionRepository(db);
const loteRepository = new LoteRepository(db);
const auditRepository = new AuditRepository(db);
const auditService = new AuditService(auditRepository);
const loteService = new LoteService(loteRepository, auditService);

const extrusorPPService = new ExtrusorPPService(
  extrusorPPRepository,
  loteService,
  lineaEjecucionRepository,
  auditService
);

const extrusorPPController = new ExtrusorPPController(extrusorPPService);

// Endpoints
router.get('/detalle/:bitacoraId', authorize(PERMISSIONS.VIEW_PRODUCTION), extrusorPPController.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_PRODUCTION), extrusorPPController.guardarDetalle);

module.exports = router;
