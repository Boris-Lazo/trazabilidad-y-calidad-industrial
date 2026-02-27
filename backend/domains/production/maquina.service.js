const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

class MaquinaService {
    constructor(maquinaRepository, auditService) {
        this.maquinaRepository = maquinaRepository;
        this.auditService = auditService;
    }

    async getAllMachines() {
        return await this.maquinaRepository.findAll();
    }

    async getMachineById(id) {
        const machine = await this.maquinaRepository.findById(id);
        if (!machine) throw new NotFoundError('Máquina no encontrada');
        return machine;
    }

    async updateMachineStatus(id, { nuevoEstado, motivo, categoria, usuario }) {
        const machine = await this.getMachineById(id);
        const estadoAnterior = machine.estado_actual;

        if (estadoAnterior === 'Baja') {
            throw new ValidationError('No se puede modificar el estado de una máquina que ha sido dada de baja.');
        }

        if (estadoAnterior === nuevoEstado) {
            throw new ValidationError(`La máquina ya se encuentra en estado ${nuevoEstado}.`);
        }

        // Regla de negocio: No se puede poner fuera de servicio si tiene órdenes activas
        if (nuevoEstado === 'Fuera de servicio' || nuevoEstado === 'Baja' || nuevoEstado === 'En mantenimiento') {
            const hasActiveOrders = await this._checkActiveOrders(id);
            if (hasActiveOrders) {
                throw new ValidationError('No se puede cambiar el estado a uno no operativo mientras existan órdenes de producción activas en esta máquina.');
            }
        }

        const dataAdicional = {};
        if (nuevoEstado === 'Baja') {
            dataAdicional.fecha_baja = new Date().toISOString();
            dataAdicional.motivo_baja = motivo;
        }

        await this.maquinaRepository.db.withTransaction(async () => {
            await this.maquinaRepository.updateEstado(id, nuevoEstado, motivo, categoria, usuario, dataAdicional);

            await this.auditService.logStatusChange(
                usuario,
                'MAQUINAS',
                id,
                estadoAnterior,
                nuevoEstado,
                motivo,
                categoria
            );
        });

        return { id, estado_anterior: estadoAnterior, estado_nuevo: nuevoEstado };
    }

    async getMachineHistory(id) {
        await this.getMachineById(id);
        return await this.maquinaRepository.getHistorialEstados(id);
    }

    async _checkActiveOrders(maquinaId) {
        const sql = "SELECT COUNT(*) as count FROM lineas_ejecucion WHERE maquina_id = ? AND estado = 'ACTIVA'";
        const result = await this.maquinaRepository.db.get(sql, [maquinaId]);
        return result.count > 0;
    }
}

module.exports = MaquinaService;
