
const express = require('express');
const router = express.Router();
const bitacoraController = require('./bitacora.controller');

router.get('/suggested', bitacoraController.getSuggestedInfo);
router.get('/current', bitacoraController.getCurrent);
router.post('/open', bitacoraController.open);
router.post('/:id/close', bitacoraController.close);
router.get('/:id/status', bitacoraController.getStatus);
router.get('/:id/stats', bitacoraController.getStats);

module.exports = router;
