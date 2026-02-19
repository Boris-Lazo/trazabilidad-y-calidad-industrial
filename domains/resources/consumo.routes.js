
// domains/resources/consumo.routes.js
const express = require('express');
const router = express.Router();
const ConsumoController = require('./consumo.controller');

// Definición de las rutas para Consumo

// GET /api/consumos/registro-trabajo/:registroTrabajoId -> Obtener todos los consumos para un registro de trabajo
router.get('/registro-trabajo/:registroTrabajoId', ConsumoController.getByRegistroTrabajoId);

// POST /api/consumos -> Crear un nuevo registro de consumo
router.post('/', ConsumoController.create);

// PUT /api/consumos/:id -> Actualizar un registro de consumo
router.put('/:id', ConsumoController.update);

// DELETE /api/consumos/:id -> Eliminar un registro de consumo
router.delete('/:id', ConsumoController.delete);

module.exports = router;
