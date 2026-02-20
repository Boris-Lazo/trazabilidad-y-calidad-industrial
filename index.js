
const path = require('path');
require('dotenv').config();
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
app.use(helmet());
app.use(compression());

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

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
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ordenes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ordenes.html'));
});

app.get('/detalles_orden.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'detalles_orden.html'));
});

app.get('/ejecucion.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ejecucion.html'));
});

app.get('/incidentes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'incidentes.html'));
});

app.get('/calidad.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calidad.html'));
});

app.get('/trazabilidad.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trazabilidad.html'));
});

app.get('/configuracion.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'configuracion.html'));
});

app.get('/auditoria.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auditoria.html'));
});

app.get('/lotes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lotes.html'));
});

app.get('/muestras.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'muestras.html'));
});

app.get('/bitacora.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bitacora.html'));
});

app.get('/proceso.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'proceso.html'));
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
