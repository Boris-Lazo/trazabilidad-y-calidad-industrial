const ExtrusorPPContract = require('./ExtrusorPPContract');
const TelarContract = require('./TelarContract');
const LaminadoContract = require('./LaminadoContract');
const ImprentaContract = require('./ImprentaContract');
const ConversionSacosContract = require('./ConversionSacosContract');
const ExtrusionPEContract = require('./ExtrusionPEContract');
const ConversionLinerPEContract = require('./ConversionLinerPEContract');
const PeletizadoContract = require('./PeletizadoContract');
const ConversionSacosVestidosContract = require('./ConversionSacosVestidosContract');
const NotFoundError = require('../../../shared/errors/NotFoundError');

class ProcessRegistry {
    constructor() {
        this.contracts = new Map();
        this._register(new ExtrusorPPContract());
        this._register(new TelarContract());
        this._register(new LaminadoContract());
        this._register(new ImprentaContract());
        this._register(new ConversionSacosContract());
        this._register(new ExtrusionPEContract());
        this._register(new ConversionLinerPEContract());
        this._register(new PeletizadoContract());
        this._register(new ConversionSacosVestidosContract());
    }

    _register(contract) {
        this.contracts.set(Number(contract.processId), contract);
    }

    /**
     * Devuelve el contrato correspondiente al processId.
     * @param {number|string} processId
     * @returns {ProcessContract}
     * @throws {Error} Si el proceso no existe.
     */
    get(processId) {
        const id = Number(processId);
        const contract = this.contracts.get(id);
        if (!contract) {
            throw new NotFoundError(`El proceso con ID ${processId} no está definido en el registro estático.`);
        }
        return contract;
    }

    /**
     * Retorna todos los contratos registrados.
     * @returns {ProcessContract[]}
     */
    getAll() {
        return Array.from(this.contracts.values());
    }
}

module.exports = new ProcessRegistry();
