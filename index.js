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
      "script-src": ["'self'", "https://unpkg.com"],
      "connect-src": ["'self'"],
      "img-src": ["'self'", "data:", "https://*"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"]
    },
  },
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json());

// --- RUTAS PÚBLICAS Y ACTIVOS ESTÁTICOS ---
// Servir todos los archivos estáticos de CSS y JS de forma pública y antes de cualquier otra ruta.
// Esto asegura que los assets como hojas de estilo y scripts se carguen sin autenticación.
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));

// Rutas de API y páginas que explícitamente no requieren autenticación
app.use('/api/auth', authRoutes);
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));


// --- PROTECCIÓN GLOBAL ---
// Todas las rutas definidas después de este middleware requerirán autenticación.
// Si la autenticación falla, redirigirá a /login.html.
app.use(authMiddleware);

// --- RUTAS PROTEGIDAS (API) ---
// Todas las llamadas a la API (excepto /api/auth) están protegidas.
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

// --- RUTAS PROTEGIDAS (Frontend - HTML) ---
// Se sirven explícitamente los archivos HTML que requieren que el usuario esté logueado.
// La ruta raíz '/' sirve 'index.html'.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const protectedPages = [
    'auditoria.html', 'bitacora.html', 'calidad.html', 'configuracion.html', 
    'detalles_orden.html', 'ejecucion.html', 'incidentes.html', 'lotes.html', 
    'muestras.html', 'ordenes.html', 'proceso.html', 'trazabilidad.html'
];

protectedPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', page));
    });
});

// Se elimina el app.use(express.static('public')) de esta sección para evitar conflictos
// y asegurar que solo los archivos HTML especificados sean servidos por estas rutas protegidas.

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
