
const express = require('express');
const router = express.Router();
const TelaresController = require('./telares.controller');
const TelaresService = require('./telares.service');
const TelaresRepository = require('./telares.repository');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const MuestraRepository = require('./muestra.repository');
const LoteRepository = require('../quality/lote.repository');
const LoteService = require('../quality/lote.service');
const AuditService = require('../../shared/audit/AuditService');
const AuditRepository = require('../../shared/audit/AuditRepository');
const sqlite = require('../../database/sqlite');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');

const telaresRepo = new TelaresRepository(sqlite);
const lineaRepo = new LineaEjecucionRepository(sqlite);
const registroRepo = new RegistroTrabajoRepository(sqlite);
const muestraRepo = new MuestraRepository(sqlite);
const loteRepo = new LoteRepository(sqlite);
const auditRepo = new AuditRepository(sqlite);
const auditSvc = new AuditService(auditRepo);
const loteService = new LoteService(loteRepo, auditSvc);

const telaresService = new TelaresService(
  telaresRepo,
  lineaRepo,
  registroRepo,
  muestraRepo,
  loteService
);
const telaresController = new TelaresController(telaresService);

router.get('/resumen', telaresController.getResumen);
router.get('/paro-tipos', telaresController.getParoTipos);
router.get('/detalle/:maquinaId', telaresController.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_QUALITY), telaresController.guardarDetalle);

module.exports = router;
