const express = require('express');
const loteController = require('./lote.controller');
const muestraController = require('./muestra.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

// Rutas de Lotes
router.get('/lotes/orden/:id', loteController.getByOrdenId);
router.post('/lotes', loteController.create);

// Rutas de Muestras
router.get('/muestras/lote/:id', muestraController.getByLoteId);
router.post('/muestras', muestraController.create);

module.exports = router;
