class DashboardService {
  constructor(repositories) {
    this.dashboardRepository = repositories.dashboardRepository;
    this.ordenProduccionRepository = repositories.ordenProduccionRepository;
    this.lineaEjecucionRepository = repositories.lineaEjecucionRepository;
    this.registroTrabajoRepository = repositories.registroTrabajoRepository;
    this.incidenteRepository = repositories.incidenteRepository;
    this.loteRepository = repositories.loteRepository;
    this.muestraRepository = repositories.muestraRepository;
  }

  async getSummary() {
    const counts = await this.dashboardRepository.getCounts();
    const recentOrders = await this.dashboardRepository.getRecentOrders(5);
    const criticalIncidents = await this.dashboardRepository.getCriticalIncidents(5);

    return {
      ...counts,
      recentOrders,
      criticalIncidents
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
