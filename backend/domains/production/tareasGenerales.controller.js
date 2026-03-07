const { sendSuccess } = require('../../shared/response/responseHandler');
const ValidationError  = require('../../shared/errors/ValidationError');

class TareasGeneralesController {
    constructor(tareasService) {
        this.service = tareasService;
    }

    // GET /api/tareas-generales?bitacora_id=X
    getByBitacora = async (req, res, next) => {
        try {
            const { bitacora_id } = req.query;
            if (!bitacora_id) throw new ValidationError('El parámetro bitacora_id es obligatorio.');
            const result = await this.service.getByBitacora(Number(bitacora_id));
            sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    };

    // POST /api/tareas-generales
    crear = async (req, res, next) => {
        try {
            const usuario = req.user.nombre || req.user.username;
            const result  = await this.service.crear(req.body, usuario);
            sendSuccess(res, result, 201);
        } catch (err) {
            next(err);
        }
    };

    // PUT /api/tareas-generales/:id
    editar = async (req, res, next) => {
        try {
            const usuario = req.user.nombre || req.user.username;
            const result  = await this.service.editar(
                Number(req.params.id), req.body, usuario
            );
            sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    };

    // DELETE /api/tareas-generales/:id
    eliminar = async (req, res, next) => {
        try {
            const result = await this.service.eliminar(Number(req.params.id));
            sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    };
}

module.exports = TareasGeneralesController;
