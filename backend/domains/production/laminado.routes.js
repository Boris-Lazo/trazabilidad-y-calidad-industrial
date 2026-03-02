const express = require('express');
const router = express.Router();
const LaminadoController = require('./laminado.controller');
const LaminadoService = require('./laminado.service');
const LaminadoRepository = require('./laminado.repository');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const MuestraRepository = require('./muestra.repository');
const LoteRepository = require('../quality/lote.repository');
const LoteService = require('../quality/lote.service');
const AuditService = require('../../shared/audit/AuditService');
const AuditRepository = require('../../shared/audit/AuditRepository');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');

const laminadoRepo = new LaminadoRepository(sqlite);
const lineaRepo = new LineaEjecucionRepository(sqlite);
const registroRepo = new RegistroTrabajoRepository(sqlite);
const muestraRepo = new MuestraRepository(sqlite);
const loteRepo = new LoteRepository(sqlite);
const auditRepo = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepo);
const loteService = new LoteService(loteRepo, auditService);

const laminadoService = new LaminadoService(
    laminadoRepo,
    lineaRepo,
    registroRepo,
    muestraRepo,
    loteService
);
const laminadoController = new LaminadoController(laminadoService);

router.get('/detalle/:maquinaId', laminadoController.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_QUALITY), laminadoController.guardarDetalle);

module.exports = router;
