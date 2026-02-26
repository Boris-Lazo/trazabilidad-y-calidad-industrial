const ProcessContract = require('./ProcessContract');

class ConversionSacosContract extends ProcessContract {
    constructor() {
        super({
            processId: 5,
            nombre: 'Conversión de sacos',
            unidadProduccion: 'unidades',
            tiposOrdenPermitidos: ['Órdenes de Conversión (Serie 5XXXXXX)'],
            maquinasPermitidas: ["Maquinaria estándar del proceso"],
            metricasObligatorias: [
                { nombre: 'resistencia_valvula', unidad: 'kgf' },
                { nombre: 'dimensiones', unidad: 'mm' }
            ]
        });
    }
}

module.exports = ConversionSacosContract;
