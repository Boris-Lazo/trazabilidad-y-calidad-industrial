
const express = require('express');
const router = express.Router();
const TelaresController = require('./telares.controller');
const TelaresService = require('./telares.service');
const TelaresRepository = require('./telares.repository');
const LineaEjecucionRepository = require('./lineaEjecucion.repository');
const RegistroTrabajoRepository = require('./registroTrabajo.repository');
const MuestraRepository = require('./muestra.repository');
const IncidenteRepository = require('./incidente.repository');
const LoteRepository = require('../quality/lote.repository');
const sqlite = require('../../database/sqlite');
const authMiddleware = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');

const telaresRepo = new TelaresRepository(sqlite);
const lineaRepo = new LineaEjecucionRepository(sqlite);
const registroRepo = new RegistroTrabajoRepository(sqlite);
const muestraRepo = new MuestraRepository(sqlite);
const incidenteRepo = new IncidenteRepository(sqlite);
const loteRepo = new LoteRepository(sqlite);

const telaresService = new TelaresService(telaresRepo, lineaRepo, registroRepo, muestraRepo, incidenteRepo, loteRepo);
const telaresController = new TelaresController(telaresService);

router.get('/resumen', telaresController.getResumen);
router.get('/paro-tipos', telaresController.getParoTipos);
router.get('/detalle/:maquinaId', telaresController.getDetalle);
router.post('/guardar', authorize(PERMISSIONS.MANAGE_QUALITY), telaresController.guardarDetalle);

module.exports = router;
