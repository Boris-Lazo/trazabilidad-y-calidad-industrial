const express = require('express');
const LoteRepository = require('./lote.repository');
const LoteService = require('./lote.service');
const LoteController = require('./lote.controller');
const sqlite = require('../../database/sqlite');

const loteRepository = new LoteRepository(sqlite);
const loteService = new LoteService(loteRepository);
const loteController = new LoteController(loteService);

const router = express.Router();

router.get('/orden/:id', loteController.getByOrdenId);
router.post('/', loteController.create);

module.exports = router;
