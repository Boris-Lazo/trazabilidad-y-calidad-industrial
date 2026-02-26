const express = require('express');
const router = express.Router();
const processRegistry = require('./contracts/ProcessRegistry');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');
const { sendSuccess } = require('../../shared/response/responseHandler');

/**
 * @route GET /api/procesos
 * @desc Obtiene la definición estática e inmutable de todos los procesos productivos
 * @access Administrador, Jefe de Operaciones, Inspector, Supervisor, Gerencia
 */
router.get('/', authorize(PERMISSIONS.VIEW_PROCESSES), (req, res, next) => {
    try {
        const processes = processRegistry.getAll().map(p => p.toJSON());
        return sendSuccess(res, processes);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
