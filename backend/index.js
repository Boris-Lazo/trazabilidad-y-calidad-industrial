
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

// Importar rutas
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
            "script-src": ["'self'", "https://unpkg.com", "'unsafe-inline'"],
        },
    },
}));
app.use(compression());

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'frontend'
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Integrar rutas de la API
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

// Rutas del Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.get('/ordenes.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'ordenes.html'));
});

app.get('/detalles_orden.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'detalles_orden.html'));
});

app.get('/ejecucion.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'ejecucion.html'));
});

app.get('/incidentes.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'incidentes.html'));
});

app.get('/calidad.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'calidad.html'));
});

app.get('/trazabilidad.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'trazabilidad.html'));
});

app.get('/configuracion.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'configuracion.html'));
});

app.get('/auditoria.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'auditoria.html'));
});

app.get('/lotes.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'lotes.html'));
});

app.get('/muestras.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'muestras.html'));
});

app.get('/bitacora.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'bitacora.html'));
});

app.get('/registro_proceso.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'registro_proceso.html'));
});

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
