
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-prod-sys';

const authMiddleware = (req, res, next) => {
    // Permitir el login sin token (aunque ya debería estar fuera de este middleware por el orden en index.js)
    if (req.path === '/api/auth/login' || req.path === '/login.html') {
        return next();
    }

    let token = null;

    // 1. Intentar obtener de Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    // 2. Intentar obtener de Cookies
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ message: 'Sesión no iniciada o token faltante.' });
        } else {
            return res.redirect('/login.html');
        }
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (req.path.startsWith('/api/')) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'La sesión ha expirado. Por favor, inicie sesión nuevamente.' });
            }
            return res.status(401).json({ message: 'Token inválido.' });
        } else {
            return res.redirect('/login.html');
        }
    }
};

module.exports = authMiddleware;
