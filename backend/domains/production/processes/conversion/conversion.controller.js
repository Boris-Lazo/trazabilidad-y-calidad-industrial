const { sendSuccess } = require('../../../../shared/response/responseHandler');
const ValidationError = require('../../../../shared/errors/ValidationError');

class ConversionController {
    constructor(conversionService) {
        this.conversionService = conversionService;
    }

    getResumen = async (req, res, next) => {
        try {
            const { bitacora_id } = req.query;
            if (!bitacora_id) throw new ValidationError('El ID de bitácora es obligatorio.');

            const resumen = await this.conversionService.getResumen(Number(bitacora_id));
            sendSuccess(res, resumen);
        } catch (error) {
            next(error);
        }
    };

    getDetalle = async (req, res, next) => {
        try {
            const { maquinaId } = req.params;
            const { bitacora_id } = req.query;

            if (!maquinaId) throw new ValidationError('El ID de máquina es obligatorio.');
            if (!bitacora_id) throw new ValidationError('El ID de bitácora es obligatorio.');

            const detalle = await this.conversionService.getDetalle(Number(bitacora_id), Number(maquinaId));
            sendSuccess(res, detalle);
        } catch (error) {
            next(error);
        }
    };

    guardarDetalle = async (req, res, next) => {
        try {
            const usuario = req.user.nombre || req.user.username;
            const resultado = await this.conversionService.saveDetalle(req.body, usuario);
            sendSuccess(res, resultado, 201);
        } catch (error) {
            next(error);
        }
    };
}

module.exports = ConversionController;
