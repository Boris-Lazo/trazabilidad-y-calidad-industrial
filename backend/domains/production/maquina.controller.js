const { sendSuccess } = require('../../shared/response/responseHandler');

class MaquinaController {
    constructor(maquinaService) {
        this.maquinaService = maquinaService;
    }

    async getAll(req, res, next) {
        try {
            const machines = await this.maquinaService.getAllMachines();
            sendSuccess(res, machines);
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const machine = await this.maquinaService.getMachineById(req.params.id);
            sendSuccess(res, machine);
        } catch (error) {
            next(error);
        }
    }

    async updateStatus(req, res, next) {
        try {
            const { nuevoEstado, motivo, categoria } = req.body;
            const usuario = req.user.username;
            const result = await this.maquinaService.updateMachineStatus(req.params.id, {
                nuevoEstado,
                motivo,
                categoria,
                usuario
            });
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    async getHistory(req, res, next) {
        try {
            const history = await this.maquinaService.getMachineHistory(req.params.id);
            sendSuccess(res, history);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = MaquinaController;
