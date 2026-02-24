const express = require('express');
const router = express.Router();
const GruposController = require('./grupos.controller');
const GruposService = require('./grupos.service');
const GruposRepository = require('./grupos.repository');
const PersonalRepository = require('../personal/personal.repository');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const AuditRepository = require('../../shared/audit/AuditRepository');
const AuditService = require('../../shared/audit/AuditService');
const { PERMISSIONS } = require('../../shared/auth/permissions');

const gruposRepository = new GruposRepository(sqlite);
const personalRepository = new PersonalRepository(sqlite);
const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);
const gruposService = new GruposService(gruposRepository, personalRepository, auditService);
const gruposController = new GruposController(gruposService);

router.get('/', authorize(PERMISSIONS.VIEW_STAFF), (req, res, next) => gruposController.getGrupos(req, res, next));
router.get('/roles-operativos', authorize(PERMISSIONS.VIEW_STAFF), (req, res, next) => gruposController.getRolesOperativos(req, res, next));
router.get('/:id', authorize(PERMISSIONS.VIEW_STAFF), (req, res, next) => gruposController.getGrupoDetalle(req, res, next));

router.post('/:id/integrantes', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => gruposController.addIntegrante(req, res, next));
router.post('/:id/integrantes/:personaId/remove', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => gruposController.removeIntegrante(req, res, next));
router.put('/:id/turno', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => gruposController.rotarTurno(req, res, next));

router.get('/persona/:personaId/historial', authorize(PERMISSIONS.VIEW_STAFF), (req, res, next) => gruposController.getHistorialPersona(req, res, next));
router.post('/persona/:personaId/rol-operativo', authorize(PERMISSIONS.MANAGE_STAFF), (req, res, next) => gruposController.assignRolOperativo(req, res, next));

module.exports = router;
