const ProcessContract = require('./ProcessContract');

class ConversionSacosVestidosContract extends ProcessContract {
    constructor() {
        super({
            processId: 9,
            nombre: 'Conversión de sacos vestidos',
            unidadProduccion: 'unidades',
            tiposOrdenPermitidos: ['Órdenes de Sacos Vestidos (Serie 9XXXXXX)'],
            maquinasPermitidas: ["Maquinaria estándar del proceso"],
            metricasObligatorias: [
                { nombre: 'calidad_vestido', unidad: 'calificación' }
            ]
        });
    }
}

module.exports = ConversionSacosVestidosContract;
