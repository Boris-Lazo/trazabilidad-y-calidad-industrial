const ProcessContract = require('./ProcessContract');

class TelarContract extends ProcessContract {
    constructor() {
        super({
            processId: 2,
            nombre: 'Telares',
            unidadProduccion: 'metros',
            tiposOrdenPermitidos: ['Órdenes de Tejeduría (Serie 2XXXXXX)'],
            maquinasPermitidas: ['Telares T-01 al T-13'],
            metricasObligatorias: [
                { nombre: 'eficiencia', unidad: '%' },
                { nombre: 'picos', unidad: 'cuenta' },
                { nombre: 'ancho', unidad: 'cm' }
            ],
            motivo: 'Definición base para telares circulares'
        });
    }
}

module.exports = TelarContract;
