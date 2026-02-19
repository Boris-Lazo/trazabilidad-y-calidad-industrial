
/**
 * ARCHIVO PRINCIPAL DEL SERVIDOR (BACKEND)
 * Este archivo configura el servidor Express, los middlewares de seguridad,
 * las rutas de la API y sirve los archivos estáticos del frontend.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

// Importar las rutas de los diferentes dominios del sistema
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

// --- CONFIGURACIÓN DE MIDDLEWARES ---

// Middlewares de seguridad (Helmet) y compresión de respuestas
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            // Se extienden las directivas por defecto para permitir Lucide Icons desde unpkg
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://unpkg.com", "'unsafe-inline'"],
        },
    },
}));
app.use(compression());

// Middleware para procesar cuerpos de solicitudes en formato JSON
app.use(express.json());

// Servir archivos estáticos (HTML, CSS, JS, Imágenes) desde la carpeta 'frontend'
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- REGISTRO DE RUTAS DE LA API ---
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

/**
 * Middleware de manejo de errores centralizado.
 * Captura cualquier error no manejado en las rutas y devuelve una respuesta 500.
 */
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.stack);
  res.status(500).json({ message: 'Ha ocurrido un error interno en el servidor.', error: err.message });
});

// Configuración del puerto (por defecto 3000 o el definido en .env)
const PORT = process.env.PORT || 3000;

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
