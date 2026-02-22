class DashboardRepository {
  constructor(db) {
    this.db = db;
  }

  async getCounts() {
    const ordenesActivas = await this.db.get("SELECT COUNT(*) as count FROM orden_produccion WHERE estado IN ('en proceso', 'abierta')");
    const lineasEjecucion = await this.db.get("SELECT COUNT(*) as count FROM lineas_ejecucion WHERE estado = 'activo'");
    const registrosAbiertos = await this.db.get("SELECT COUNT(*) as count FROM registros_trabajo WHERE estado = 'abierto'");
    const incidentesActivos = await this.db.get("SELECT COUNT(*) as count FROM incidentes WHERE estado = 'abierto'");

    return {
      ordenesActivas: ordenesActivas.count,
      lineasEjecucion: lineasEjecucion.count,
      registrosAbiertos: registrosAbiertos.count,
      incidentesActivos: incidentesActivos.count
    };
  }

  async getRecentOrders(limit = 5) {
    return await this.db.query(
      "SELECT * FROM orden_produccion WHERE estado IN ('en proceso', 'abierta') ORDER BY fecha_creacion DESC LIMIT ?",
      [limit]
    );
  }

  async getCriticalIncidents(limit = 5) {
    return await this.db.query(
      "SELECT * FROM incidentes WHERE severidad = 'alta' AND estado = 'abierto' ORDER BY fecha_creacion DESC LIMIT ?",
      [limit]
    );
  }
}

module.exports = DashboardRepository;
