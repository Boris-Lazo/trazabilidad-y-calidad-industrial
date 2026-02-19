
// domains/quality/loteProduccion.routes.js
const express = require('express');
const router = express.Router();
const LoteProduccionController = require('./loteProduccion.controller');

// Definición de las rutas para LoteProduccion

// GET /api/lotes/orden-produccion/:ordenProduccionId -> Obtener todos los lotes para una orden de producción
router.get('/orden-produccion/:ordenProduccionId', LoteProduccionController.getByOrdenProduccionId);

// POST /api/lotes -> Crear un nuevo lote de producción
router.post('/', LoteProduccionController.create);

// PUT /api/lotes/:id -> Actualizar un lote de producción
router.put('/:id', LoteProduccionController.update);

// DELETE /api/lotes/:id -> Eliminar un lote de producción
router.delete('/:id', LoteProduccionController.delete);

module.exports = router;
