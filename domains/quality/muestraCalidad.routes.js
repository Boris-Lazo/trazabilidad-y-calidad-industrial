// domains/quality/muestraCalidad.routes.js
const express = require('express');
const router = express.Router();
const MuestraCalidadController = require('./muestraCalidad.controller');

// Definición de las rutas para MuestraCalidad

// GET /api/muestras/lote/:loteProduccionId -> Obtener todas las muestras para un lote de producción
router.get('/lote/:loteProduccionId', MuestraCalidadController.getByLoteProduccionId);

// POST /api/muestras -> Crear un nuevo registro de muestra de calidad
router.post('/', MuestraCalidadController.create);

// PUT /api/muestras/:id -> Actualizar una muestra de calidad
router.put('/:id', MuestraCalidadController.update);

// DELETE /api/muestras/:id -> Eliminar una muestra de calidad
router.delete('/:id', MuestraCalidadController.delete);

module.exports = router;
