const express = require('express');
const loteController = require('./lote.controller');
const router = express.Router();
router.get('/orden/:id', loteController.getByOrdenId);
router.post('/', loteController.create);
module.exports = router;
