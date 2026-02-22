const express = require('express');
const RecursoRepository = require('./recurso.repository');
const RecursoService = require('./recurso.service');
const RecursoController = require('./recurso.controller');
const sqlite = require('../../database/sqlite');

const recursoRepository = new RecursoRepository(sqlite);
const recursoService = new RecursoService(recursoRepository);
const recursoController = new RecursoController(recursoService);

const router = express.Router();

router.get('/', recursoController.getAll);
router.post('/', recursoController.create);

module.exports = router;
