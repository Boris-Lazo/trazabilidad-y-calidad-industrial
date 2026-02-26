const express = require('express');
const router = express.Router();
const processRegistry = require('./contracts/ProcessRegistry');
const authorize = require('../../middlewares/authorize');
const { PERMISSIONS } = require('../../shared/auth/permissions');

/**
 * @route GET /api/procesos
 * @desc Obtiene la definición estática e inmutable de todos los procesos productivos
 * @access Administrador, Jefe de Operaciones, Inspector
 */
router.get('/', authorize(PERMISSIONS.VIEW_PROCESSES), (req, res) => {
    try {
        const processes = processRegistry.getAll().map(p => p.toJSON());
        res.json({
            success: true,
            data: processes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
