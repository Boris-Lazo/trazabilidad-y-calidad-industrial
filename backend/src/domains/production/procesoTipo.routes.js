const express = require('express');
const procesoTipoController = require('./procesoTipo.controller');
const router = express.Router();

router.get('/', procesoTipoController.getAll);

module.exports = router;
