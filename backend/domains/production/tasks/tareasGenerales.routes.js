const express = require('express');
const router  = express.Router();

const TareasGeneralesController = require('./tareasGenerales.controller');
const TareasGeneralesService    = require('./tareasGenerales.service');
const TareasGeneralesRepository = require('./tareasGenerales.repository');
const db                        = require('../../../database/sqlite');
const authorize                 = require('../../../middlewares/authorize');
const { PERMISSIONS }           = require('../../../shared/auth/permissions');

const repo    = new TareasGeneralesRepository(db);
const service = new TareasGeneralesService(repo);
const ctrl    = new TareasGeneralesController(service);

// GET  /api/tareas-generales?bitacora_id=X  — lista tareas de una bitácora
router.get('/',       authorize(PERMISSIONS.VIEW_PRODUCTION),   ctrl.getByBitacora);

// POST /api/tareas-generales                — crear tarea
router.post('/',      authorize(PERMISSIONS.MANAGE_PRODUCTION),  ctrl.crear);

// PUT  /api/tareas-generales/:id            — editar tarea
router.put('/:id',    authorize(PERMISSIONS.MANAGE_PRODUCTION),  ctrl.editar);

// DELETE /api/tareas-generales/:id          — eliminar tarea
router.delete('/:id', authorize(PERMISSIONS.MANAGE_PRODUCTION),  ctrl.eliminar);

module.exports = router;
