const ProcessContract = require('./ProcessContract');

class ExtrusionPEContract extends ProcessContract {
    constructor() {
        super({
            processId: 6,
            nombre: 'Extrusión PE',
            unidadProduccion: 'kg',
            tiposOrdenPermitidos: ['Órdenes de Extrusión Polietileno (Serie 6XXXXXX)'],
            metricasObligatorias: [
                { nombre: 'espesor', unidad: 'micras' },
                { nombre: 'ancho_burbuja', unidad: 'mm' }
            ]
        });
    }
}

module.exports = ExtrusionPEContract;
