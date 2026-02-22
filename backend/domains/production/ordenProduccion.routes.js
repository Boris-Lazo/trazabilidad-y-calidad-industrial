const express = require('express');
const OrdenProduccionRepository = require('./ordenProduccion.repository');
const OrdenProduccionService = require('./ordenProduccion.service');
const OrdenProduccionController = require('./ordenProduccion.controller');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');

// Instanciación manual
const ordenProduccionRepository = new OrdenProduccionRepository(sqlite);
const ordenProduccionService = new OrdenProduccionService(ordenProduccionRepository);
const ordenProduccionController = new OrdenProduccionController(ordenProduccionService);

const router = express.Router();

router.get('/', ordenProduccionController.getAll);
router.get('/:id', ordenProduccionController.getById);
router.post('/', authorize('ADMIN'), ordenProduccionController.create);
router.put('/:id', authorize('ADMIN'), ordenProduccionController.update);
router.delete('/:id', authorize('ADMIN'), ordenProduccionController.remove);

module.exports = router;
