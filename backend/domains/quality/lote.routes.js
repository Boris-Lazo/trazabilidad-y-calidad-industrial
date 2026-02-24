const express = require('express');
const LoteRepository = require('./lote.repository');
const LoteService = require('./lote.service');
const LoteController = require('./lote.controller');
const sqlite = require('../../database/sqlite');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');

const loteRepository = new LoteRepository(sqlite);
const loteService = new LoteService(loteRepository);
const loteController = new LoteController(loteService);

const router = express.Router();

router.get('/orden/:id', loteController.getByOrdenId);
router.post('/', authorize(PERMISSIONS.MANAGE_QUALITY), loteController.create);

module.exports = router;
