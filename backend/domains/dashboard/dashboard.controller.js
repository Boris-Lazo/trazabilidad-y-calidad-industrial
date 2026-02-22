const dashboardService = require('./dashboard.service');

const getSummary = async (req, res, next) => {
    try {
        const summary = await dashboardService.getSummary();
        res.json(summary);
    } catch (error) {
        next(error);
    }
};

const getOrdenProduccionDashboard = async (req, res, next) => {
    try {
        const dashboard = await dashboardService.getOrdenProduccionDashboard(req.params.ordenProduccionId);
        if (!dashboard) return res.status(404).json({ message: 'Orden no encontrada' });
        res.json(dashboard);
    } catch (error) {
        next(error);
    }
};

module.exports = { getSummary, getOrdenProduccionDashboard };
