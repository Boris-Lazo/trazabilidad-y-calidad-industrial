
// domains/production/registroTrabajo.routes.js
const express = require('express');
const router = express.Router();
const RegistroTrabajoController = require('./registroTrabajo.controller');

// Definición de las rutas para RegistroTrabajo

// GET /api/registros-trabajo/linea/:lineaId -> Obtener todos los registros para una línea de ejecución
router.get('/linea/:lineaId', RegistroTrabajoController.getByLineaId);

// POST /api/registros-trabajo -> Crear un nuevo registro de trabajo
router.post('/', RegistroTrabajoController.create);

// PUT /api/registros-trabajo/:id -> Actualizar un registro de trabajo
router.put('/:id', RegistroTrabajoController.update);

// DELETE /api/registros-trabajo/:id -> Eliminar un registro de trabajo
router.delete('/:id', RegistroTrabajoController.delete);

module.exports = router;
