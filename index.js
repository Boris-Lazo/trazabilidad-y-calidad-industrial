
const path = require('path');
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

// Importar rutas
const procesoTipoRoutes = require('./domains/production/procesoTipo.routes');
const ordenProduccionRoutes = require('./domains/production/ordenProduccion.routes');
const lineaEjecucionRoutes = require('./domains/production/lineaEjecucion.routes');
const registroTrabajoRoutes = require('./domains/production/registroTrabajo.routes');
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
app.use('/api/ordenes-produccion', ordenProduccionRoutes);
app.use('/api/lineas-ejecucion', lineaEjecucionRoutes);
app.use('/api/registros-trabajo', registroTrabajoRoutes);
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

app.get('/lotes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lotes.html'));
});

app.get('/muestras.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'muestras.html'));
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
