const ProcessContract = require('./ProcessContract');

class ConversionSacosVestidosContract extends ProcessContract {
    constructor() {
        super(9, 'Conversión de sacos vestidos', 'unidades');
    }
}

module.exports = ConversionSacosVestidosContract;
