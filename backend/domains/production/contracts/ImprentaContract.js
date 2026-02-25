const ProcessContract = require('./ProcessContract');

class ImprentaContract extends ProcessContract {
    constructor() {
        super(4, 'Imprenta', 'impresiones');
    }
}

module.exports = ImprentaContract;
