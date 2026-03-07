const express = require('express');
const router = express.Router();
const authorize = require('../../../middlewares/authorize');
const { PERMISSIONS } = require('../../../shared/auth/permissions');

const MaquinaRepository = require('./maquina.repository');
const MaquinaService = require('./maquina.service');
const MaquinaController = require('./maquina.controller');
const AuditRepository = require('../../../shared/audit/AuditRepository');
const AuditService = require('../../../shared/audit/AuditService');
const db = require('../../../database/sqlite');

const repository = new MaquinaRepository(db);
const auditService = new AuditService(new AuditRepository(db));
const service = new MaquinaService(repository, auditService);
const controller = new MaquinaController(service);

router.get('/', authorize(PERMISSIONS.VIEW_MACHINES), (req, res, next) => controller.getAll(req, res, next));
router.get('/:id', authorize(PERMISSIONS.VIEW_MACHINES), (req, res, next) => controller.getById(req, res, next));
router.get('/:id/historial', authorize(PERMISSIONS.VIEW_MACHINES), (req, res, next) => controller.getHistory(req, res, next));
router.put('/:id/estado', authorize(PERMISSIONS.MANAGE_MACHINES), (req, res, next) => controller.updateStatus(req, res, next));

module.exports = router;
