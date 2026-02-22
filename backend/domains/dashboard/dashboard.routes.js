const express = require('express');
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/summary', dashboardController.getSummary);
router.get('/orden/:ordenProduccionId', dashboardController.getOrdenProduccionDashboard);

module.exports = router;
