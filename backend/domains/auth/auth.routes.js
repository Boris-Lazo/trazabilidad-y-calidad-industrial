// Definición de rutas para el dominio Auth con Inyección de Dependencias manual
const express = require('express');
const AuthRepository = require('./auth.repository');
const AuthService = require('./auth.service');
const AuthController = require('./auth.controller');
const sqlite = require('../../database/sqlite');
const tokenService = require('../../shared/security/token.service');
const validate = require('../../middlewares/validation.middleware');
const { loginSchema } = require('./auth.validation');
const { loginLimiter } = require('../../middlewares/rateLimiter');

// Instanciación manual de dependencias
const authRepository = new AuthRepository(sqlite);
const authService = new AuthService(authRepository, tokenService);
const authController = new AuthController(authService);

const router = express.Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.login);

module.exports = router;
