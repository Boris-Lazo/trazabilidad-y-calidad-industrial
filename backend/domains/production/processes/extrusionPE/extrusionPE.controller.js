const { sendSuccess } = require('../../../../shared/response/responseHandler');
const ValidationError = require('../../../../shared/errors/ValidationError');

class ExtrusionPEController {
    constructor(extrusionPEService) {
        this.service = extrusionPEService;
    }

    getDetalle = async (req, res, next) => {
        try {
            const { bitacora_id, maquina_id } = req.query;
            if (!bitacora_id) throw new ValidationError('bitacora_id es obligatorio.');

            const result = await this.service.getDetalle(
                Number(bitacora_id),
                maquina_id ? Number(maquina_id) : null
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    };

    saveDetalle = async (req, res, next) => {
        try {
            const usuario = req.user.nombre || req.user.username;
            const result = await this.service.saveDetalle(req.body, usuario);
            sendSuccess(res, result, 201);
        } catch (error) {
            next(error);
        }
    };
}

module.exports = ExtrusionPEController;
