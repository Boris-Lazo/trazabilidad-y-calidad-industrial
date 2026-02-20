
const express = require('express');
const router = express.Router();
const BitacoraController = require('./bitacora.controller');

router.get('/estado', BitacoraController.getEstadoActual.bind(BitacoraController));
router.get('/inspectores', BitacoraController.getInspectores.bind(BitacoraController));
router.get('/proceso-data', BitacoraController.getProcesoData.bind(BitacoraController));
router.post('/abrir', BitacoraController.abrirBitacora.bind(BitacoraController));
router.post('/guardar-proceso', BitacoraController.guardarProcesoData.bind(BitacoraController));
router.post('/:id/cerrar', BitacoraController.cerrarBitacora.bind(BitacoraController));

module.exports = router;
