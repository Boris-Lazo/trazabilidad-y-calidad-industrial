
// domains/dashboard/dashboard.routes.js
const express = require('express');
const router = express.Router();
const DashboardController = require('./dashboard.controller');

// GET /api/dashboard/orden-produccion/:ordenProduccionId -> Obtener el dashboard de una orden de producción
router.get('/orden-produccion/:ordenProduccionId', DashboardController.getOrdenProduccionDashboard);

module.exports = router;
