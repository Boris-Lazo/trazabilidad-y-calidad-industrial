const express = require('express');
const bitacoraController = require('./bitacora.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/estado', bitacoraController.getEstadoActual);
router.get('/tiempo-actual', bitacoraController.getTiempoActual);
router.get('/proceso-data', bitacoraController.getProcesoData);
router.get('/inspectores', bitacoraController.getInspectores);
router.post('/abrir', bitacoraController.abrirBitacora);
router.post('/cerrar/:id', bitacoraController.cerrarBitacora);
router.post('/guardar-proceso', bitacoraController.guardarProcesoData);

module.exports = router;
