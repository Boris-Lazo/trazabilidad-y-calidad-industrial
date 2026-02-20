
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Auth = require('./auth.model');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-prod-sys';

const AuthController = {
    async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
            }

            const user = await Auth.findByUsername(username);

            if (!user) {
                return res.status(401).json({ message: 'Usuario inexistente o credenciales incorrectas.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ message: 'Credenciales incorrectas.' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username, rol: user.rol, nombre: user.nombre },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            // Set cookie for browser-based navigation protection
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 8 * 60 * 60 * 1000 // 8 hours
            });

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    rol: user.rol,
                    nombre: user.nombre
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Error interno en el servidor.' });
        }
    }
};

module.exports = AuthController;
