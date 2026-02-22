const { sendSuccess } = require('../../shared/response/responseHandler');
const NotFoundError = require('../../shared/errors/NotFoundError');

class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  getSummary = async (req, res, next) => {
    try {
      const summary = await this.dashboardService.getSummary();
      return sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  };

  getOrdenDashboard = async (req, res, next) => {
    try {
      const data = await this.dashboardService.getOrdenProduccionDashboard(req.params.id);
      if (!data) throw new NotFoundError('Orden no encontrada');
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = DashboardController;
