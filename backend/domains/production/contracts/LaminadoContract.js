const ProcessContract = require('./ProcessContract');

class LaminadoContract extends ProcessContract {
    constructor() {
        super(3, 'Laminado', 'metros');
    }
}

module.exports = LaminadoContract;
