class DashboardService {
  constructor(repositories) {
    this.ordenProduccionRepository = repositories.ordenProduccionRepository;
    this.lineaEjecucionRepository = repositories.lineaEjecucionRepository;
    this.registroTrabajoRepository = repositories.registroTrabajoRepository;
    this.incidenteRepository = repositories.incidenteRepository;
    this.loteRepository = repositories.loteRepository;
    this.muestraRepository = repositories.muestraRepository;
  }

  async getSummary() {
    const ordenes = await this.ordenProduccionRepository.findAll();
    const lineas = await this.lineaEjecucionRepository.findAll();
    const registros = await this.registroTrabajoRepository.findAll();
    const incidentes = await this.incidenteRepository.findAll();

    return {
      ordenesActivas: ordenes.filter(o => o.estado === 'en proceso' || o.estado === 'abierta').length,
      lineasEjecucion: lineas.filter(l => l.estado === 'activo').length,
      registrosAbiertos: registros.filter(r => r.estado === 'abierto').length,
      incidentesActivos: incidentes.filter(i => i.estado === 'abierto').length,
      recentOrders: ordenes.filter(o => o.estado === 'en proceso' || o.estado === 'abierta').slice(0, 5),
      criticalIncidents: incidentes.filter(i => i.severidad === 'alta' && i.estado === 'abierto').slice(0, 5)
    };
  }

  async getOrdenProduccionDashboard(ordenId) {
    const orden = await this.ordenProduccionRepository.findById(ordenId);
    if (!orden) return null;

    const lineas = await this.lineaEjecucionRepository.findByOrdenProduccionId(ordenId);
    for (const linea of lineas) {
      linea.registros_trabajo = await this.registroTrabajoRepository.findByLineaEjecucionId(linea.id);
    }

    const lotes = await this.loteRepository.findByOrdenId(ordenId);
    for (const lote of lotes) {
      lote.muestras_calidad = await this.muestraRepository.findByLoteId(lote.id);
    }

    return {
      orden_produccion: orden,
      lineas_ejecucion: lineas,
      lotes_produccion: lotes,
    };
  }
}

module.exports = DashboardService;
