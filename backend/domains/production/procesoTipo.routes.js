const express = require('express');
const ProcesoTipoRepository = require('./procesoTipo.repository');
const ProcesoTipoService = require('./procesoTipo.service');
const ProcesoTipoController = require('./procesoTipo.controller');
const sqlite = require('../../database/sqlite');

// Instanciación manual
const procesoTipoRepository = new ProcesoTipoRepository(sqlite);
const procesoTipoService = new ProcesoTipoService(procesoTipoRepository);
const procesoTipoController = new ProcesoTipoController(procesoTipoService);

const router = express.Router();

router.get('/', procesoTipoController.getAll);

module.exports = router;
