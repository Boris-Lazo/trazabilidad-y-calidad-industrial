
const express = require('express');
const router = express.Router();
const IncidenteController = require('./incidente.controller');

router.get('/', IncidenteController.getAll);
router.post('/', IncidenteController.create);
router.put('/:id', IncidenteController.update);

module.exports = router;
