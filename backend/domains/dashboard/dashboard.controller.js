
// domains/dashboard/dashboard.controller.js
const OrdenProduccion = require('../production/ordenProduccion.model');
const LineaEjecucion = require('../production/lineaEjecucion.model');
const RegistroTrabajo = require('../production/registroTrabajo.model');
const LoteProduccion = require('../quality/loteProduccion.model');
const MuestraCalidad = require('../quality/muestraCalidad.model');

const DashboardController = {
    async getSummary(req, res, next) {
        try {
            const ordenes = await OrdenProduccion.findAll();
            const lineas = await LineaEjecucion.findAll();
            const registros = await RegistroTrabajo.findAll();
            const incidentes = await require('../production/incidente.model').findAll();

            const summary = {
                ordenesActivas: ordenes.filter(o => o.estado === 'en proceso' || o.estado === 'abierta').length,
                lineasEjecucion: lineas.filter(l => l.estado === 'activo').length,
                registrosAbiertos: registros.filter(r => r.estado === 'abierto').length,
                incidentesActivos: incidentes.filter(i => i.estado === 'abierto').length,
                recentOrders: ordenes.filter(o => o.estado === 'en proceso' || o.estado === 'abierta').slice(0, 5),
                criticalIncidents: incidentes.filter(i => i.severidad === 'alta' && i.estado === 'abierto').slice(0, 5)
            };

            res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    },

    async getOrdenProduccionDashboard(req, res, next) {
        try {
            const { ordenProduccionId } = req.params;

            // 1. Obtener la orden de producción
            const ordenProduccion = await OrdenProduccion.findById(ordenProduccionId);
            if (!ordenProduccion) {
                return res.status(404).json({ message: 'Orden de producción no encontrada.' });
            }

            // 2. Obtener las líneas de ejecución
            const lineasEjecucion = await LineaEjecucion.findByOrdenProduccionId(ordenProduccionId);

            // 3. Obtener los registros de trabajo para cada línea de ejecución
            for (const linea of lineasEjecucion) {
                linea.registros_trabajo = await RegistroTrabajo.findByLineaEjecucionId(linea.id);
            }

            // 4. Obtener los lotes de producción
            const lotesProduccion = await LoteProduccion.findByOrdenProduccionId(ordenProduccionId);

            // 5. Obtener las muestras de calidad para cada lote
            for (const lote of lotesProduccion) {
                lote.muestras_calidad = await MuestraCalidad.findByLoteProduccionId(lote.id);
            }

            // 6. Consolidar la información
            const dashboard = {
                orden_produccion: ordenProduccion,
                lineas_ejecucion: lineasEjecucion,
                lotes_produccion: lotesProduccion,
            };

            res.status(200).json(dashboard);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = DashboardController;
