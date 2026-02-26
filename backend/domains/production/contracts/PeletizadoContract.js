const ProcessContract = require('./ProcessContract');

class PeletizadoContract extends ProcessContract {
    constructor() {
        super({
            processId: 8,
            nombre: 'Peletizado',
            unidadProduccion: 'kg',
            tiposOrdenPermitidos: ['Órdenes de Peletizado (Serie 8XXXXXX)'],
            maquinasPermitidas: ["Maquinaria estándar del proceso"],
            metricasObligatorias: [
                { nombre: 'densidad', unidad: 'g/cm3' },
                { nombre: 'color_pelet', unidad: 'nombre' }
            ]
        });
    }
}

module.exports = PeletizadoContract;
