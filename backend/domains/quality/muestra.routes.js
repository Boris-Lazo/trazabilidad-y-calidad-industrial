const express = require('express');
const QualityMuestraRepository = require('./muestra.repository');
const QualityMuestraService = require('./muestra.service');
const QualityMuestraController = require('./muestra.controller');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');

const muestraRepository = new QualityMuestraRepository(sqlite);
const muestraService = new QualityMuestraService(muestraRepository);
const muestraController = new QualityMuestraController(muestraService);

const router = express.Router();

router.get('/lote/:id', muestraController.getByLoteId);
router.post('/', authorize('ADMIN', 'INSPECTOR'), muestraController.create);

module.exports = router;
