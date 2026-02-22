const express = require('express');
const IncidenteRepository = require('./incidente.repository');
const IncidenteService = require('./incidente.service');
const IncidenteController = require('./incidente.controller');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');

// Instanciación manual
const incidenteRepository = new IncidenteRepository(sqlite);
const incidenteService = new IncidenteService(incidenteRepository);
const incidenteController = new IncidenteController(incidenteService);

const router = express.Router();

router.get('/', incidenteController.getAll);
router.post('/', authorize('ADMIN', 'INSPECTOR', 'OPERACIONES'), incidenteController.create);
router.put('/:id', authorize('ADMIN', 'INSPECTOR', 'OPERACIONES'), incidenteController.update);

module.exports = router;
