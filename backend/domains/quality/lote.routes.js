const express = require('express');
const LoteRepository = require('./lote.repository');
const LoteService = require('./lote.service');
const LoteController = require('./lote.controller');
const AuditService = require('../../shared/audit/AuditService');
const AuditRepository = require('../../shared/audit/AuditRepository');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');

const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);
const loteRepository = new LoteRepository(sqlite);
const loteService = new LoteService(loteRepository, auditService);
const loteController = new LoteController(loteService);

const router = express.Router();

router.get('/activos', authorize(PERMISSIONS.VIEW_QUALITY),
  loteController.getActivos);
router.get('/orden/:id', authorize(PERMISSIONS.VIEW_QUALITY),
  loteController.getByOrdenId);
router.get('/consumo-telar', authorize(PERMISSIONS.VIEW_QUALITY),
  loteController.getConsumoTelar);

module.exports = router;
