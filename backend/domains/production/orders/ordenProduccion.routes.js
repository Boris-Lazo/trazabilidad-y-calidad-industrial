const express = require('express');
const multer = require('multer');
const { sendSuccess } = require('../../../shared/response/responseHandler');
const OrdenProduccionRepository = require('./ordenProduccion.repository');
const OrdenProduccionService = require('./ordenProduccion.service');
const OrdenProduccionController = require('./ordenProduccion.controller');
const sqlite = require('../../../database/sqlite');
const authMiddleware = require('../../../middlewares/auth.middleware');
const authorize = require('../../../middlewares/authorize');
const { PERMISSIONS } = require('../../../shared/auth/permissions');
const AuditRepository = require('../../../shared/audit/AuditRepository');
const AuditService = require('../../../shared/audit/AuditService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Instanciación manual
const ordenProduccionRepository = new OrdenProduccionRepository(sqlite);
const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);
const ordenProduccionService = new OrdenProduccionService(ordenProduccionRepository, auditService);
const ordenProduccionController = new OrdenProduccionController(ordenProduccionService);

const router = express.Router();

router.get('/',    ordenProduccionController.getAll);
router.get('/:id', ordenProduccionController.getById);
router.get('/:id/trazabilidad', ordenProduccionController.getTraceability);
router.post('/',   authorize(PERMISSIONS.MANAGE_PRODUCTION), ordenProduccionController.create);
router.put('/:id', authorize(PERMISSIONS.MANAGE_PRODUCTION), ordenProduccionController.update);
router.delete('/:id', authorize(PERMISSIONS.MANAGE_PRODUCTION), ordenProduccionController.remove);

// Órdenes de emergencia
router.post('/emergencia/nueva',
    authMiddleware, authorize(PERMISSIONS.MANAGE_PRODUCTION),
    ordenProduccionController.crearEmergencia);

// Vincular orden EM a código SAP oficial
router.post('/:id/vincular-sap',
    authMiddleware, authorize(PERMISSIONS.MANAGE_PRODUCTION),
    ordenProduccionController.vincularEmergencia);

// Endpoints de importación masiva SAP
router.post(
  '/importar/previsualizar',
  authMiddleware,
  authorize(PERMISSIONS.MANAGE_PRODUCTION),
  upload.single('archivo'),
  async (req, res, next) => {
    try {
      const usuario = req.user ? req.user.username : 'SISTEMA';
      const resultado = await ordenProduccionService.procesarImportacionExcel(req.file.buffer, usuario);
      return sendSuccess(res, resultado);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/importar/confirmar',
  authMiddleware,
  authorize(PERMISSIONS.MANAGE_PRODUCTION),
  async (req, res, next) => {
    try {
      const usuario = req.user ? req.user.username : 'SISTEMA';
      const resultado = await ordenProduccionService.confirmarImportacion(req.body.ordenes, usuario);
      return sendSuccess(res, resultado);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
