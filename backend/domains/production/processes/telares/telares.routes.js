const express = require('express');
const router = express.Router();

const TelaresRepository       = require('./telares.repository');
const TelaresService          = require('./telares.service');
const TelaresController       = require('./telares.controller');
const LineaEjecucionRepository = require('../../execution/lineaEjecucion.repository');
const RegistroTrabajoRepository = require('../../execution/registroTrabajo.repository');
const MuestraRepository        = require('../../execution/muestra.repository');
const LoteRepository           = require('../../../quality/lote.repository');
const LoteService              = require('../../../quality/lote.service');
const ParoRepository           = require('../../incidents/paro.repository');
const ParoService              = require('../../incidents/paro.service');
const AuditRepository          = require('../../../../shared/audit/AuditRepository');
const AuditService             = require('../../../../shared/audit/AuditService');
const sqlite                   = require('../../../../database/sqlite');
const authorize                = require('../../../../middlewares/authorize');
const { PERMISSIONS }          = require('../../../../shared/auth/permissions');

// Instanciación
const telaresRepo  = new TelaresRepository(sqlite);
const lineaRepo    = new LineaEjecucionRepository(sqlite);
const registroRepo = new RegistroTrabajoRepository(sqlite);
const muestraRepo  = new MuestraRepository(sqlite);
const loteRepo     = new LoteRepository(sqlite);
const bitacoraRepo = require('../../execution/bitacora.repository'); // Importación diferente para paros
const paroRepo     = new ParoRepository(sqlite);
const auditRepo    = new AuditRepository(sqlite);
const auditSvc     = new AuditService(auditRepo);
const loteService  = new LoteService(loteRepo, auditSvc);
const paroService  = new ParoService(paroRepo, bitacoraRepo);

const telaresService = new TelaresService(
  telaresRepo,
  lineaRepo,
  registroRepo,
  muestraRepo,
  loteService,
  paroService,
  auditSvc
);
const telaresController = new TelaresController(telaresService);

router.get('/resumen', authorize(), telaresController.getResumen);
router.get('/paro-tipos', authorize(), telaresController.getParoTipos);
router.get('/detalle/:maquinaId', authorize(), telaresController.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_QUALITY), telaresController.guardarDetalle);

module.exports = router;
