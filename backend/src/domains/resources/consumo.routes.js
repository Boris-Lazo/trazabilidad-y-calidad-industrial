const express = require('express');
const consumoController = require('./consumo.controller');
const router = express.Router();
router.get('/registro/:id', consumoController.getByRegistroId);
router.post('/', consumoController.create);
module.exports = router;
