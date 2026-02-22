const express = require('express');
const muestraController = require('./muestra.controller');
const router = express.Router();
router.get('/lote/:id', muestraController.getByLoteId);
router.post('/', muestraController.create);
module.exports = router;
