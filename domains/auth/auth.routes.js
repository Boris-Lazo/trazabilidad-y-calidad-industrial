
const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');

router.post('/login', AuthController.login.bind(AuthController));
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Sesión cerrada' });
});

module.exports = router;
