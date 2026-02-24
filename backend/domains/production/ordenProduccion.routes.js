const express = require('express');
const OrdenProduccionRepository = require('./ordenProduccion.repository');
const OrdenProduccionService = require('./ordenProduccion.service');
const OrdenProduccionController = require('./ordenProduccion.controller');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const AuditRepository = require('../../shared/audit/AuditRepository');
const AuditService = require('../../shared/audit/AuditService');

// Instanciación manual
const ordenProduccionRepository = new OrdenProduccionRepository(sqlite);
const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);
const ordenProduccionService = new OrdenProduccionService(ordenProduccionRepository, auditService);
const ordenProduccionController = new OrdenProduccionController(ordenProduccionService);

const router = express.Router();

router.get('/', ordenProduccionController.getAll);
router.get('/:id', ordenProduccionController.getById);
router.post('/', authorize('Administrador', 'ADMIN'), ordenProduccionController.create);
router.put('/:id', authorize('Administrador', 'ADMIN'), ordenProduccionController.update);
router.delete('/:id', authorize('Administrador', 'ADMIN'), ordenProduccionController.remove);

module.exports = router;
