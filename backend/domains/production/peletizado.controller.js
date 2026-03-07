const { sendSuccess } = require('../../shared/response/responseHandler');
const ValidationError  = require('../../shared/errors/ValidationError');

class PeletizadoController {
    constructor(peletizadoService) {
        this.service = peletizadoService;
    }

    // GET /api/peletizado/detalle?bitacora_id=X
    getDetalle = async (req, res, next) => {
        try {
            const { bitacora_id } = req.query;
            if (!bitacora_id) throw new ValidationError('El parámetro bitacora_id es obligatorio.');
            const result = await this.service.getDetalle(Number(bitacora_id));
            sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    };

    // POST /api/peletizado/guardar
    guardarDetalle = async (req, res, next) => {
        try {
            const usuario = req.user.nombre || req.user.username;
            const result  = await this.service.saveDetalle(req.body, usuario);
            sendSuccess(res, result, 201);
        } catch (err) {
            next(err);
        }
    };
}

module.exports = PeletizadoController;
