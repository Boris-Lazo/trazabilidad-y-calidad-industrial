const express = require('express');
const router = express.Router();
const LoteRepository = require('./lote.repository');
const LoteService = require('./lote.service');
const LoteController = require('./lote.controller');
const AuditService = require('../../shared/audit/AuditService');
const AuditRepository = require('../../shared/audit/AuditRepository');
const sqlite = require('../../database/sqlite');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');

const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);
const loteRepository = new LoteRepository(sqlite);
const loteService = new LoteService(loteRepository, auditService);
const loteController = new LoteController(loteService);

// Lotes disponibles para consumo en telares (activos + pausados)
router.get('/disponibles',
  authMiddleware, authorize(PERMISSIONS.VIEW_QUALITY),
  loteController.getDisponibles);

// Lotes por orden
router.get('/orden/:id',
  authMiddleware, authorize(PERMISSIONS.VIEW_QUALITY),
  loteController.getByOrdenId);

// Consumo declarado por un telar en una bitácora
router.get('/consumo-telar',
  authMiddleware, authorize(PERMISSIONS.VIEW_QUALITY),
  loteController.getConsumoTelar);

// Historial de cambios de estado de un lote
router.get('/:id/historial',
  authMiddleware, authorize(PERMISSIONS.VIEW_QUALITY),
  loteController.getHistorialEstado);

// Trazabilidad completa de un lote (dónde se produjo + dónde se consumió)
router.get('/:id/trazabilidad',
  authMiddleware, authorize(PERMISSIONS.VIEW_QUALITY),
  loteController.getTrazabilidad);

// Cambiar estado de un lote (activo ↔ pausado → cerrado)
// Cualquier usuario autenticado puede ejecutarlo, queda registro del usuario
router.patch('/:id/estado',
  authMiddleware,
  loteController.cambiarEstado);

module.exports = router;
