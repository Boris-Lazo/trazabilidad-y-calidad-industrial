
// domains/production/procesoTipo.routes.js
const express = require('express');
const router = express.Router();
const ProcesoTipoController = require('./procesoTipo.controller');

// Definición de las rutas para ProcesoTipo

// GET /api/procesos-tipo -> Obtener todos los tipos de proceso
router.get('/', ProcesoTipoController.getAll);

// GET /api/procesos-tipo/:id -> Obtener un tipo de proceso por ID
router.get('/:id', ProcesoTipoController.getById);

// POST /api/procesos-tipo -> Crear un nuevo tipo de proceso
router.post('/', ProcesoTipoController.create);

// PUT /api/procesos-tipo/:id -> Actualizar un tipo de proceso existente
router.put('/:id', ProcesoTipoController.update);

// DELETE /api/procesos-tipo/:id -> Eliminar un tipo de proceso
router.delete('/:id', ProcesoTipoController.delete);

module.exports = router;
