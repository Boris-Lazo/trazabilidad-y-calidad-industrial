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
const { PERMISSIONS } = require('../../shared/auth/permissions');

// Rutas de gestión de personal protegidas por permisos específicos
router.get('/', authorize(PERMISSIONS.VIEW_STAFF), (req, res, next) => personalController.getAllStaff(req, res, next));
router.get('/catalogos', authorize(PERMISSIONS.VIEW_STAFF), (req, res, next) => personalController.getCatalogs(req, res, next));
router.get('/:id', authorize(PERMISSIONS.VIEW_STAFF), (req, res, next) => personalController.getStaffDetails(req, res, next));

router.post('/', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => personalController.registerStaff(req, res, next));
router.put('/:id', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => personalController.updateStaff(req, res, next));
router.post('/:id/rol', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => personalController.assignRole(req, res, next));
router.put('/:id/estado', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => personalController.updateStatus(req, res, next));
router.put('/:id/reactivar', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => personalController.reactivateUser(req, res, next));

// Asignaciones operativas pueden ser hechas por quienes tengan el permiso ASSIGN_OPERATIONS
router.post('/:id/asignacion', authorize(PERMISSIONS.ASSIGN_OPERATIONS), (req, res, next) => personalController.assignOperation(req, res, next));

module.exports = router;
