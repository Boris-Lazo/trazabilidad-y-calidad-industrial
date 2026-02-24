const express = require('express');
const router = express.Router();
const PersonalController = require('./personal.controller');
const PersonalService = require('./personal.service');
const PersonalRepository = require('./personal.repository');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const AuditRepository = require('../../shared/audit/AuditRepository');
const AuditService = require('../../shared/audit/AuditService');

const personalRepository = new PersonalRepository(sqlite);
const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);
const personalService = new PersonalService(personalRepository, auditService);
const personalController = new PersonalController(personalService);

// Todas las rutas de gestión de personal requieren ser ADMIN
router.get('/', authorize('Administrador', 'ADMIN'), (req, res, next) => personalController.getAllStaff(req, res, next));
router.get('/catalogos', authorize('Administrador', 'ADMIN'), (req, res, next) => personalController.getCatalogs(req, res, next));
router.get('/:id', authorize('Administrador', 'ADMIN'), (req, res, next) => personalController.getStaffDetails(req, res, next));
router.post('/', authorize('Administrador', 'ADMIN'), (req, res, next) => personalController.registerStaff(req, res, next));
router.put('/:id', authorize('Administrador', 'ADMIN'), (req, res, next) => personalController.updateStaff(req, res, next));
router.post('/:id/rol', authorize('Administrador', 'ADMIN'), (req, res, next) => personalController.assignRole(req, res, next));

// Asignaciones operativas pueden ser hechas por Inspector o Supervisor también
router.post('/:id/asignacion', authorize('Administrador', 'ADMIN', 'Inspector', 'Supervisor'), (req, res, next) => personalController.assignOperation(req, res, next));

module.exports = router;
