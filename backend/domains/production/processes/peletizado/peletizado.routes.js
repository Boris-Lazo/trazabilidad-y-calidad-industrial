const express = require('express');
const router = express.Router();

const PeletizadoService       = require('./peletizado.service');
const PeletizadoRepository    = require('./peletizado.repository');
const PeletizadoController    = require('./peletizado.controller');
const LineaEjecucionRepository = require('../../execution/lineaEjecucion.repository');
const RegistroTrabajoRepository = require('../../execution/registroTrabajo.repository');
const LoteRepository          = require('../../../quality/lote.repository');
const LoteService             = require('../../../quality/lote.service');
const AuditRepository         = require('../../../../shared/audit/AuditRepository');
const AuditService            = require('../../../../shared/audit/AuditService');
const sqlite                  = require('../../../../database/sqlite');
const authorize               = require('../../../../middlewares/authorize');
const { PERMISSIONS }         = require('../../../../shared/auth/permissions');

// Instanciación
const peletizadoRepository    = new PeletizadoRepository(sqlite);
const lineaEjecucionRepository = new LineaEjecucionRepository(sqlite);
const registroTrabajoRepository = new RegistroTrabajoRepository(sqlite);
const loteRepository          = new LoteRepository(sqlite);
const auditRepository         = new AuditRepository(sqlite);
const auditService            = new AuditService(auditRepository);
const loteService             = new LoteService(loteRepository, auditService);

const peletizadoService = new PeletizadoService(
  peletizadoRepository,
  lineaEjecucionRepository,
  loteService,
  auditService
);

const ctrl = new PeletizadoController(peletizadoService);

router.get('/detalle', authorize(PERMISSIONS.VIEW_PRODUCTION), ctrl.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_PRODUCTION), ctrl.saveDetalle);

module.exports = router;
