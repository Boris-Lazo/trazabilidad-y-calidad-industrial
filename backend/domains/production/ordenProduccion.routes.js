
// domains/production/ordenProduccion.routes.js
const express = require('express');
const router = express.Router();
const OrdenProduccionController = require('./ordenProduccion.controller');

// Definición de las rutas para OrdenProduccion

// GET /api/ordenes-produccion -> Obtener todas las órdenes
router.get('/', OrdenProduccionController.getAll);

// GET /api/ordenes-produccion/:id -> Obtener una orden por ID
router.get('/:id', OrdenProduccionController.getById);

// POST /api/ordenes-produccion -> Crear una nueva orden
router.post('/', OrdenProduccionController.create);

// PUT /api/ordenes-produccion/:id -> Actualizar una orden existente
router.put('/:id', OrdenProduccionController.update);

// DELETE /api/ordenes-produccion/:id -> Eliminar una orden
router.delete('/:id', OrdenProduccionController.delete);

module.exports = router;
