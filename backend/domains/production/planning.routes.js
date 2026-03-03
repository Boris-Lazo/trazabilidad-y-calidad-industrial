// Rutas para el módulo de planificación operativa semanal
const express = require('express');
const PlanningRepository = require('./planning.repository');
const PlanningService = require('./planning.service');
const PlanningController = require('./planning.controller');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');
const AuditRepository = require('../../shared/audit/AuditRepository');
const AuditService = require('../../shared/audit/AuditService');

const planningRepository = new PlanningRepository(sqlite);
const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);
const planningService = new PlanningService(planningRepository, auditService);
const planningController = new PlanningController(planningService);

const router = express.Router();

router.get('/week/:anio/:semana', authorize(PERMISSIONS.VIEW_PRODUCTION), planningController.getPlan);
router.post('/create', authorize(PERMISSIONS.ASSIGN_OPERATIONS), planningController.createPlan);
router.post('/assign-order', authorize(PERMISSIONS.ASSIGN_OPERATIONS), planningController.assignOrder);
router.post('/assign-personnel', authorize(PERMISSIONS.ASSIGN_OPERATIONS), planningController.assignPersonnel);
router.post('/delete-order', authorize(PERMISSIONS.ASSIGN_OPERATIONS), planningController.deleteOrder);
router.post('/delete-personnel', authorize(PERMISSIONS.ASSIGN_OPERATIONS), planningController.deletePersonnel);
router.post('/publish', authorize(PERMISSIONS.ASSIGN_OPERATIONS), planningController.publish);
router.post('/deviation', authorize(PERMISSIONS.MANAGE_PRODUCTION), planningController.recordDeviation);
router.get('/motivos-desviacion', authorize(PERMISSIONS.VIEW_PRODUCTION), planningController.getMotivosDesviacion);
router.get('/desviaciones', authorize(PERMISSIONS.VIEW_PRODUCTION), planningController.getDeviaciones);
router.get('/kpi/:plan_id', authorize(PERMISSIONS.VIEW_PRODUCTION), planningController.getKPIs);

module.exports = router;
