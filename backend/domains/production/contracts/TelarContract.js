const ProcessContract = require('./ProcessContract');

class TelarContract extends ProcessContract {
    constructor() {
        super(2, 'Telares', 'metros');
    }

    parametrosObligatorios() {
        return ['eficiencia', 'picos'];
    }
}

module.exports = TelarContract;
