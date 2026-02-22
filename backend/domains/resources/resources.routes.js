const express = require('express');
const recursoController = require('./recurso.controller');
const consumoController = require('./consumo.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

// Rutas de Recursos
router.get('/recursos', recursoController.getAll);
router.post('/recursos', recursoController.create);

// Rutas de Consumos
router.get('/consumos/registro/:id', consumoController.getByRegistroId);
router.post('/consumos', consumoController.create);

module.exports = router;
