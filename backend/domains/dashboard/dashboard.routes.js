const express = require('express');
const DashboardService = require('./dashboard.service');
const DashboardController = require('./dashboard.controller');
const OrdenProduccionRepository = require('../production/ordenProduccion.repository');
const LineaEjecucionRepository = require('../production/lineaEjecucion.repository');
const RegistroTrabajoRepository = require('../production/registroTrabajo.repository');
const IncidenteRepository = require('../production/incidente.repository');
const LoteRepository = require('../quality/lote.repository');
const QualityMuestraRepository = require('../quality/muestra.repository');
const sqlite = require('../../database/sqlite');

// Instanciación manual de dependencias requeridas por el Dashboard
const repositories = {
    ordenProduccionRepository: new OrdenProduccionRepository(sqlite),
    lineaEjecucionRepository: new LineaEjecucionRepository(sqlite),
    registroTrabajoRepository: new RegistroTrabajoRepository(sqlite),
    incidenteRepository: new IncidenteRepository(sqlite),
    loteRepository: new LoteRepository(sqlite),
    muestraRepository: new QualityMuestraRepository(sqlite)
};

const dashboardService = new DashboardService(repositories);
const dashboardController = new DashboardController(dashboardService);

const router = express.Router();

router.get('/summary', dashboardController.getSummary);
router.get('/orden/:id', dashboardController.getOrdenDashboard);

module.exports = router;
