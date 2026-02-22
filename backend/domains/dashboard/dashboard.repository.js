class DashboardRepository {
  constructor(db) {
    this.db = db;
  }
  // Si hubiera queries complejas específicas de dashboard irían aquí.
  // Por ahora el service coordina otros repositorios.
}

module.exports = DashboardRepository;
