// Configuración principal de la aplicación Express
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { NODE_ENV } = require('../config/env');
const errorMiddleware = require('../middlewares/error.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const { requestLogger } = require('../shared/logger/logger');

// Importar rutas
const authRoutes = require('../domains/auth/auth.routes');
const procesoTipoRoutes = require('../domains/production/procesoTipo.routes');
const bitacoraRoutes = require('../domains/production/bitacora.routes');
const ordenProduccionRoutes = require('../domains/production/ordenProduccion.routes');
const incidenteRoutes = require('../domains/production/incidente.routes');
const loteRoutes = require('../domains/quality/lote.routes');
const muestraRoutes = require('../domains/quality/muestra.routes');
const recursoRoutes = require('../domains/resources/recurso.routes');
const consumoRoutes = require('../domains/resources/consumo.routes');
const dashboardRoutes = require('../domains/dashboard/dashboard.routes');

const app = express();

// --- MIDDLEWARES DE SEGURIDAD Y RENDIMIENTO ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://unpkg.com"],
      "connect-src": ["'self'"],
      "img-src": ["'self'", "data:", "https://*"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"]
    },
  },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por ventana
  message: {
    success: false,
    data: null,
    error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(requestLogger);
app.use(compression());
app.use(cookieParser());
app.use(express.json());

// --- ACTIVOS ESTÁTICOS PÚBLICOS ---
app.use('/css', express.static(path.join(__dirname, '../../frontend/public/css')));
app.use('/js', express.static(path.join(__dirname, '../../frontend/public/js')));

// --- RUTAS DE API ---
app.use('/api/auth', authRoutes);

// Rutas protegidas de API
app.use('/api/procesos-tipo', authMiddleware, procesoTipoRoutes);
app.use('/api/bitacora', authMiddleware, bitacoraRoutes);
app.use('/api/ordenes-produccion', authMiddleware, ordenProduccionRoutes);
app.use('/api/incidentes', authMiddleware, incidenteRoutes);
app.use('/api/lotes', authMiddleware, loteRoutes);
app.use('/api/muestras', authMiddleware, muestraRoutes);
app.use('/api/recursos', authMiddleware, recursoRoutes);
app.use('/api/consumos', authMiddleware, consumoRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// --- FRONTEND (PÁGINAS HTML) ---
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/public/login.html')));

app.get('/', authMiddleware, (req, res) => res.sendFile(path.join(__dirname, '../../frontend/index.html')));

const protectedPages = [
    'auditoria.html', 'bitacora.html', 'calidad.html', 'configuracion.html',
    'detalles_orden.html', 'ejecucion.html', 'incidentes.html', 'lotes.html',
    'muestras.html', 'ordenes.html', 'proceso.html', 'trazabilidad.html'
];

protectedPages.forEach(page => {
    app.get(`/${page}`, authMiddleware, (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/public', page));
    });
});

// --- MANEJO DE ERRORES ---
app.use(errorMiddleware);

module.exports = app;
