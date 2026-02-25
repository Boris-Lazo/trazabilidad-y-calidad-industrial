const ProcessContract = require('./ProcessContract');

class ExtrusionPEContract extends ProcessContract {
    constructor() {
        super(6, 'Extrusión PE', 'kg');
    }
}

module.exports = ExtrusionPEContract;
