const ordenProduccionRepository = require('../production/ordenProduccion.repository');
const lineaEjecucionRepository = require('../production/lineaEjecucion.repository');
const registroTrabajoRepository = require('../production/registroTrabajo.repository');
const incidenteRepository = require('../production/incidente.repository');
const loteRepository = require('../quality/lote.repository');
const muestraRepository = require('../quality/muestra.repository');

const getSummary = async () => {
    const ordenes = await ordenProduccionRepository.findAll();
    const lineas = await lineaEjecucionRepository.findAll();
    const registros = await registroTrabajoRepository.findAll();
    const incidentes = await incidenteRepository.findAll();

    return {
        ordenesActivas: ordenes.filter(o => o.estado === 'en proceso' || o.estado === 'abierta').length,
        lineasEjecucion: lineas.filter(l => l.estado === 'activo').length,
        registrosAbiertos: registros.filter(r => r.estado === 'abierto').length,
        incidentesActivos: incidentes.filter(i => i.estado === 'abierto').length,
        recentOrders: ordenes.filter(o => o.estado === 'en proceso' || o.estado === 'abierta').slice(0, 5),
        criticalIncidents: incidentes.filter(i => i.severidad === 'alta' && i.estado === 'abierto').slice(0, 5)
    };
};

const getOrdenProduccionDashboard = async (ordenId) => {
    const orden = await ordenProduccionRepository.findById(ordenId);
    if (!orden) return null;

    const lineas = await lineaEjecucionRepository.findByOrdenProduccionId(ordenId);
    for (const linea of lineas) {
        linea.registros_trabajo = await registroTrabajoRepository.findByLineaEjecucionId(linea.id);
    }

    const lotes = await loteRepository.findByOrdenId(ordenId);
    for (const lote of lotes) {
        lote.muestras_calidad = await muestraRepository.findByLoteId(lote.id);
    }

    return {
        orden_produccion: orden,
        lineas_ejecucion: lineas,
        lotes_produccion: lotes,
    };
};

module.exports = { getSummary, getOrdenProduccionDashboard };
