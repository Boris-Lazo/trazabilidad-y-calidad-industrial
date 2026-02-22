// Definición de rutas para el dominio Auth
const express = require('express');
const authController = require('./auth.controller');
const validate = require('../../middlewares/validation.middleware');
const { loginSchema } = require('./auth.validation');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
