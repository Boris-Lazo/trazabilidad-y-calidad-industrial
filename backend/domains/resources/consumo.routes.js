const express = require('express');
const ConsumoRepository = require('./consumo.repository');
const ConsumoService = require('./consumo.service');
const ConsumoController = require('./consumo.controller');
const sqlite = require('../../database/sqlite');

const consumoRepository = new ConsumoRepository(sqlite);
const consumoService = new ConsumoService(consumoRepository);
const consumoController = new ConsumoController(consumoService);

const router = express.Router();

router.get('/registro/:id', consumoController.getByRegistroId);
router.post('/', consumoController.create);

module.exports = router;
