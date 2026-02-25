const ProcessContract = require('./ProcessContract');

class ConversionSacosContract extends ProcessContract {
    constructor() {
        super(5, 'Conversión de sacos', 'unidades');
    }
}

module.exports = ConversionSacosContract;
