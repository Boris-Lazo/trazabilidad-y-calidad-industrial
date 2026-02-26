const ProcessContract = require('./ProcessContract');

class ConversionLinerPEContract extends ProcessContract {
    constructor() {
        super({
            processId: 7,
            nombre: 'Conversión de liner',
            unidadProduccion: 'unidades',
            tiposOrdenPermitidos: ['Órdenes de Conversión Liner (Serie 7XXXXXX)'],
            maquinasPermitidas: ["Maquinaria estándar del proceso"],
            metricasObligatorias: [
                { nombre: 'calidad_sellado', unidad: 'calificación' }
            ]
        });
    }
}

module.exports = ConversionLinerPEContract;
