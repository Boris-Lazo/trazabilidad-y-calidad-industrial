
// domains/production/lineaEjecucion.routes.js
const express = require('express');
const router = express.Router();
const LineaEjecucionController = require('./lineaEjecucion.controller');

// Definición de las rutas para LineaEjecucion

// GET /api/lineas-ejecucion -> Obtener todas las líneas
router.get('/', LineaEjecucionController.getAll);

// GET /api/lineas-ejecucion/orden/:ordenId -> Obtener todas las líneas para una orden específica
router.get('/orden/:ordenId', LineaEjecucionController.getByOrderId);

// POST /api/lineas-ejecucion -> Crear una nueva línea de ejecución
router.post('/', LineaEjecucionController.create);

// PUT /api/lineas-ejecucion/:id -> Actualizar el estado de una línea
router.put('/:id', LineaEjecucionController.update);

// DELETE /api/lineas-ejecucion/:id -> Eliminar una línea
router.delete('/:id', LineaEjecucionController.delete);

module.exports = router;
