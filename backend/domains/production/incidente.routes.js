const express = require('express');
const incidenteController = require('./incidente.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/', incidenteController.getAll);
router.post('/', incidenteController.create);
router.put('/:id', incidenteController.update);

module.exports = router;
