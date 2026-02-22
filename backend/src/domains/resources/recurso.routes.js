const express = require('express');
const recursoController = require('./recurso.controller');
const router = express.Router();
router.get('/', recursoController.getAll);
router.post('/', recursoController.create);
module.exports = router;
