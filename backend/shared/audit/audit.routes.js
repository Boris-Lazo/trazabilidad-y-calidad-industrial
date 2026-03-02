const express = require('express');
const router = express.Router();
const AuditRepository = require('./AuditRepository');
const AuditService = require('./AuditService');
const sqlite = require('../../database/sqlite');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');
const { sendSuccess } = require('../response/responseHandler');

const auditRepository = new AuditRepository(sqlite);
const auditService = new AuditService(auditRepository);

router.get('/',
  authMiddleware,
  authorize(PERMISSIONS.VIEW_AUDIT),  // Cambiado de MANAGE_USERS a VIEW_AUDIT según el archivo de permisos
  async (req, res, next) => {
    try {
      const { usuario, entidad, fecha } = req.query;
      const logs = await auditService.getAll({ usuario, entidad, fecha });
      return sendSuccess(res, logs);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
