const ProcessContract = require('./ProcessContract');

class PeletizadoContract extends ProcessContract {
    constructor() {
        super(8, 'Peletizado', 'kg');
    }
}

module.exports = PeletizadoContract;
