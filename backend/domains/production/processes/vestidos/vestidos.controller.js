const { sendSuccess } = require('../../../../shared/response/responseHandler');
const ValidationError = require('../../../../shared/errors/ValidationError');

class VestidosController {
    constructor(vestidosService) {
        this.vestidosService = vestidosService;
    }

    getDetalle = async (req, res, next) => {
        try {
            const { bitacora_id } = req.query;
            if (!bitacora_id) throw new ValidationError('El ID de bitácora es obligatorio.');

            const detalle = await this.vestidosService.getDetalle(Number(bitacora_id));
            sendSuccess(res, detalle);
        } catch (error) {
            next(error);
        }
    };

    guardarDetalle = async (req, res, next) => {
        try {
            const usuario = req.user.nombre || req.user.username;
            const resultado = await this.vestidosService.saveDetalle(req.body, usuario);
            sendSuccess(res, resultado, 201);
        } catch (error) {
            next(error);
        }
    };
}

module.exports = VestidosController;
