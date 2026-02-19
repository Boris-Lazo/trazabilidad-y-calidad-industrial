
// domains/resources/recurso.routes.js
const express = require('express');
const router = express.Router();
const RecursoController = require('./recurso.controller');

// Definición de las rutas para Recurso

// GET /api/recursos -> Obtener todos los recursos
router.get('/', RecursoController.getAll);

// GET /api/recursos/:id -> Obtener un recurso por ID
router.get('/:id', RecursoController.getById);

// POST /api/recursos -> Crear un nuevo recurso
router.post('/', RecursoController.create);

// PUT /api/recursos/:id -> Actualizar un recurso
router.put('/:id', RecursoController.update);

// DELETE /api/recursos/:id -> Eliminar un recurso
router.delete('/:id', RecursoController.delete);

module.exports = router;
