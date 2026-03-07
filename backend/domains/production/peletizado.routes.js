const express = require('express');
const router  = express.Router();

const PeletizadoController     = require('./peletizado.controller');
const PeletizadoService        = require('./peletizado.service');
const PeletizadoRepository     = require('./peletizado.repository');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const LoteRepository           = require('../quality/lote.repository');
const LoteService              = require('../quality/lote.service');
const AuditRepository          = require('../../shared/audit/AuditRepository');
const AuditService             = require('../../shared/audit/AuditService');
const db                       = require('../../database/sqlite');
const authorize                = require('../../middlewares/authorize');
const { PERMISSIONS }          = require('../../shared/auth/permissions');

const peletizadoRepository     = new PeletizadoRepository(db);
const lineaEjecucionRepository = new LineaEjecucionRepository(db);
const loteRepository           = new LoteRepository(db);
const auditRepository          = new AuditRepository(db);
const auditService             = new AuditService(auditRepository);
const loteService              = new LoteService(loteRepository, auditService);

const peletizadoService = new PeletizadoService(
    peletizadoRepository,
    lineaEjecucionRepository,
    loteService
);

const ctrl = new PeletizadoController(peletizadoService);

router.get('/detalle',  authorize(PERMISSIONS.VIEW_PRODUCTION),   ctrl.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_PRODUCTION),  ctrl.guardarDetalle);

module.exports = router;
