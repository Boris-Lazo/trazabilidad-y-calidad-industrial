const express = require('express');
const router = express.Router();

const ConversionRepository    = require('./conversion.repository');
const ConversionService       = require('./conversion.service');
const ConversionController    = require('./conversion.controller');
const LineaEjecucionRepository = require('../../execution/lineaEjecucion.repository');
const LoteRepository          = require('../../../quality/lote.repository');
const LoteService             = require('../../../quality/lote.service');
const AuditRepository         = require('../../../../shared/audit/AuditRepository');
const AuditService            = require('../../../../shared/audit/AuditService');
const sqlite                  = require('../../../../database/sqlite');
const authorize               = require('../../../../middlewares/authorize');
const { PERMISSIONS }         = require('../../../../shared/auth/permissions');

// Instanciación
const conversionRepo = new ConversionRepository(sqlite);
const lineaRepo      = new LineaEjecucionRepository(sqlite);
const loteRepo       = new LoteRepository(sqlite);
const auditRepo      = new AuditRepository(sqlite);
const auditSvc       = new AuditService(auditRepo);
const loteService    = new LoteService(loteRepo, auditSvc);

const conversionService    = new ConversionService(
    conversionRepo, lineaRepo, loteService, auditSvc
);
const conversionController = new ConversionController(conversionService);

// Rutas
router.get('/resumen',
    authorize(PERMISSIONS.VIEW_PRODUCTION),
    conversionController.getResumen
);

router.get('/detalle/:maquinaId',
    authorize(PERMISSIONS.VIEW_PRODUCTION),
    conversionController.getDetalle
);

router.post('/guardar',
    authorize(PERMISSIONS.MANAGE_PRODUCTION),
    conversionController.guardarDetalle
);

module.exports = router;
