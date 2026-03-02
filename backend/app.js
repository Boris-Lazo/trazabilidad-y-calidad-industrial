// Configuración principal de la aplicación Express
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const crypto = require('crypto');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { NODE_ENV } = require('./config/env');
const errorMiddleware = require('./middlewares/error.middleware');
const authMiddleware = require('./middlewares/auth.middleware');
const { requestLogger } = require('./shared/logger/logger');
const bootstrapGuard = require('./middlewares/bootstrap.middleware');

// Importar rutas
const authRoutes = require('./domains/auth/auth.routes');
const bootstrapRoutes = require('./domains/bootstrap/bootstrap.routes');
const bitacoraRoutes = require('./domains/production/bitacora.routes');
const ordenProduccionRoutes = require('./domains/production/ordenProduccion.routes');
const incidenteRoutes = require('./domains/production/incidente.routes');
const loteRoutes = require('./domains/quality/lote.routes');
const muestraRoutes = require('./domains/quality/muestra.routes');
const recursoRoutes = require('./domains/resources/recurso.routes');
const consumoRoutes = require('./domains/resources/consumo.routes');
const dashboardRoutes = require('./domains/dashboard/dashboard.routes');
const telaresRoutes = require('./domains/production/telares.routes');
const laminadoRoutes = require('./domains/production/laminado.routes');
const imprentaRoutes = require('./domains/production/imprenta.routes');
const conversionRoutes = require('./domains/production/conversion.routes');
const vestidosRoutes = require('./domains/production/vestidos.routes');
const linerPERoutes = require('./domains/production/linerPE.routes');
const extrusorPPRoutes = require('./domains/production/extrusorPP.routes');
const personalRoutes = require('./domains/personal/personal.routes');
const gruposRoutes = require('./domains/grupos/grupos.routes');
const procesosRoutes = require('./domains/production/procesos.routes');
const maquinaRoutes = require('./domains/production/maquina.routes');
const paroRoutes = require('./domains/production/paro.routes');

const app = express();

// --- MIDDLEWARES DE SEGURIDAD Y RENDIMIENTO ---
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use((req, res, next) => {
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "https://unpkg.com", `'nonce-${res.locals.cspNonce}'`],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:"],
      }
    }
  })(req, res, next);
});

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

// --- SEGURIDAD DE ARRANQUE (BOOTSTRAP) ---
app.use(bootstrapGuard);

// --- ACTIVOS ESTÁTICOS PÚBLICOS ---
app.use('/css', express.static(path.join(__dirname, '../frontend/public/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/public/js')));
app.use('/design-system', express.static(path.join(__dirname, '../frontend/src/design-system')));

// --- RUTAS DE API ---
app.use('/api/auth', authRoutes);
app.use('/api/bootstrap', bootstrapRoutes);

// Rutas protegidas de API
app.use('/api/bitacora', authMiddleware, bitacoraRoutes);
app.use('/api/ordenes-produccion', authMiddleware, ordenProduccionRoutes);
app.use('/api/incidentes', authMiddleware, incidenteRoutes);
app.use('/api/lotes', authMiddleware, loteRoutes);
app.use('/api/muestras', authMiddleware, muestraRoutes);
app.use('/api/recursos', authMiddleware, recursoRoutes);
app.use('/api/consumos', authMiddleware, consumoRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/telares', authMiddleware, telaresRoutes);
app.use('/api/laminado', authMiddleware, laminadoRoutes);
app.use('/api/imprenta', authMiddleware, bootstrapGuard, imprentaRoutes);
app.use('/api/conversion', authMiddleware, bootstrapGuard, conversionRoutes);
app.use('/api/vestidos', authMiddleware, bootstrapGuard, vestidosRoutes);
app.use('/api/liner-pe', authMiddleware, bootstrapGuard, linerPERoutes);
app.use('/api/extrusor-pp', authMiddleware, extrusorPPRoutes);
app.use('/api/personal', authMiddleware, personalRoutes);
app.use('/api/grupos', authMiddleware, gruposRoutes);
app.use('/api/procesos', authMiddleware, procesosRoutes);
app.use('/api/maquinas', authMiddleware, maquinaRoutes);
app.use('/api/paros', authMiddleware, paroRoutes);

// --- FRONTEND (PÁGINAS HTML) ---
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/login.html')));
app.get('/bootstrap.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/bootstrap.html')));

app.get('/', authMiddleware, (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const protectedPages = [
    'auditoria.html', 'bitacora.html', 'calidad.html',
    'detalles_orden.html', 'ejecucion.html', 'incidentes.html', 'lotes.html',
    'muestras.html', 'ordenes.html', 'trazabilidad.html',
    'telares_resumen.html', 'telares_detalle.html', 'personal.html', 'grupos.html',
    'procesos.html', 'maquinas.html', 'proceso.html'
];

protectedPages.forEach(page => {
    app.get(`/${page}`, authMiddleware, (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/public', page));
    });
});

// --- MANEJO DE ERRORES ---
app.use(errorMiddleware);

module.exports = app;
