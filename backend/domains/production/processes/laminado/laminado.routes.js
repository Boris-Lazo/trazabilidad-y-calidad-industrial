const express = require('express');
const router = express.Router();

const LaminadoRepository       = require('./laminado.repository');
const LaminadoService          = require('./laminado.service');
const LaminadoController       = require('./laminado.controller');
const LineaEjecucionRepository = require('../../execution/lineaEjecucion.repository');
const RegistroTrabajoRepository = require('../../execution/registroTrabajo.repository');
const MuestraRepository        = require('../../execution/muestra.repository');
const LoteRepository           = require('../../../quality/lote.repository');
const LoteService              = require('../../../quality/lote.service');
const AuditRepository          = require('../../../../shared/audit/AuditRepository');
const AuditService             = require('../../../../shared/audit/AuditService');
const sqlite                   = require('../../../../database/sqlite');
const authorize                = require('../../../../middlewares/authorize');
const { PERMISSIONS }          = require('../../../../shared/auth/permissions');

// Instanciación de dependencias
const laminadoRepo = new LaminadoRepository(sqlite);
const lineaRepo    = new LineaEjecucionRepository(sqlite);
const registroRepo = new RegistroTrabajoRepository(sqlite);
const muestraRepo  = new MuestraRepository(sqlite);
const loteRepo     = new LoteRepository(sqlite);
const auditRepo    = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepo);
const loteService  = new LoteService(loteRepo, auditService);

const laminadoService = new LaminadoService(
    laminadoRepo,
    lineaRepo,
    registroRepo,
    muestraRepo,
    loteService,
    auditService
);
const laminadoController = new LaminadoController(laminadoService);

// Endpoints
router.get('/detalle/:maquinaId', authorize(PERMISSIONS.VIEW_PRODUCTION), laminadoController.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_PRODUCTION), laminadoController.guardarDetalle);
router.post('/upload-pdf', authorize(PERMISSIONS.MANAGE_PRODUCTION), laminadoController.uploadPdf);

module.exports = router;
