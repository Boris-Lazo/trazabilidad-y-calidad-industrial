const ProcessContract = require('./ProcessContract');

class ConversionLinerPEContract extends ProcessContract {
    constructor() {
        super(7, 'Conversión de liner', 'unidades');
    }
}

module.exports = ConversionLinerPEContract;
