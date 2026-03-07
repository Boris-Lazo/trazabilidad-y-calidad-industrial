const express = require('express');
const ParoRepository = require('./paro.repository');
const BitacoraRepository = require('../execution/bitacora.repository');
const ParoService = require('./paro.service');
const ParoController = require('./paro.controller');
const sqlite = require('../../../database/sqlite');
const authorize = require('../../../middlewares/authorize');
const { PERMISSIONS } = require('../../../shared/auth/permissions');

const paroRepository = new ParoRepository(sqlite);
const bitacoraRepository = new BitacoraRepository(sqlite);
const paroService = new ParoService(paroRepository, bitacoraRepository);
const paroController = new ParoController(paroService);

const router = express.Router();

router.get('/', authorize(PERMISSIONS.VIEW_PRODUCTION), paroController.getParosByProceso);
router.post('/', authorize(PERMISSIONS.MANAGE_PRODUCTION), paroController.create);
router.put('/:id', authorize(PERMISSIONS.MANAGE_PRODUCTION), paroController.update);
router.delete('/:id', authorize(PERMISSIONS.MANAGE_PRODUCTION), paroController.delete);
router.get('/motivos', authorize(PERMISSIONS.VIEW_PRODUCTION), paroController.getMotivos);

module.exports = router;
