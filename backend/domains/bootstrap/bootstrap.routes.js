const express = require('express');
const router = express.Router();
const BootstrapController = require('./bootstrap.controller');
const BootstrapService = require('./bootstrap.service');
const BootstrapRepository = require('./bootstrap.repository');
const sqlite = require('../../database/sqlite');
const AuditRepository = require('../../shared/audit/AuditRepository');
const AuditService = require('../../shared/audit/AuditService');

const bootstrapRepository = new BootstrapRepository(sqlite);
const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);
const bootstrapService = new BootstrapService(bootstrapRepository, auditService);
const bootstrapController = new BootstrapController(bootstrapService);

router.get('/status', bootstrapController.getStatus);
router.get('/data', bootstrapController.getInitData);
router.post('/init', bootstrapController.initialize);

module.exports = router;
