const ProcessContract = require('./ProcessContract');

class ImprentaContract extends ProcessContract {
    constructor() {
        super({
            processId: 4,
            nombre: 'Imprenta',
            unidadProduccion: 'impresiones',
            tiposOrdenPermitidos: ['Órdenes de Impresión (Serie 4XXXXXX)'],
            metricasObligatorias: [
                { nombre: 'viscosidad_tinta', unidad: 'seg' },
                { nombre: 'registro_color', unidad: 'estado' }
            ]
        });
    }
}

module.exports = ImprentaContract;
