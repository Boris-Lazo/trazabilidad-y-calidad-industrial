
const path = require('path');
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// Importar rutas
const authRoutes = require('./domains/auth/auth.routes');
const authMiddleware = require('./domains/auth/auth.middleware');
const procesoTipoRoutes = require('./domains/production/procesoTipo.routes');
const bitacoraRoutes = require('./domains/production/bitacora.routes');
const ordenProduccionRoutes = require('./domains/production/ordenProduccion.routes');
const lineaEjecucionRoutes = require('./domains/production/lineaEjecucion.routes');
const registroTrabajoRoutes = require('./domains/production/registroTrabajo.routes');
const incidenteRoutes = require('./domains/production/incidente.routes');
const recursoRoutes = require('./domains/resources/recurso.routes');
const consumoRoutes = require('./domains/resources/consumo.routes');
const loteProduccionRoutes = require('./domains/quality/loteProduccion.routes');
const muestraCalidadRoutes = require('./domains/quality/muestraCalidad.routes');
const dashboardRoutes = require('./domains/dashboard/dashboard.routes');

const app = express();

// Middlewares de seguridad y rendimiento
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'"],
    },
  },
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json());

// --- RUTAS PÚBLICAS ---
app.use('/api/auth', authRoutes);
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// Servir CSS de forma pública
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));

// Servir solo los JS necesarios de forma pública
app.get('/js/auth.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'js', 'auth.js')));
app.get('/js/login.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'js', 'login.js')));

// --- PROTECCIÓN GLOBAL ---
app.use(authMiddleware);

// --- RUTAS PROTEGIDAS (API) ---
app.use('/api/procesos-tipo', procesoTipoRoutes);
app.use('/api/bitacora', bitacoraRoutes);
app.use('/api/ordenes-produccion', ordenProduccionRoutes);
app.use('/api/lineas-ejecucion', lineaEjecucionRoutes);
app.use('/api/registros-trabajo', registroTrabajoRoutes);
app.use('/api/incidentes', incidenteRoutes);
app.use('/api/recursos', recursoRoutes);
app.use('/api/consumos', consumoRoutes);
app.use('/api/lotes', loteProduccionRoutes);
app.use('/api/muestras', muestraCalidadRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --- RUTAS PROTEGIDAS (Frontend) ---
app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Middleware de manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.stack);
  res.status(500).json({ message: 'Ha ocurrido un error interno en el servidor.', error: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
