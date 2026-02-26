const ProcessContract = require('./ProcessContract');

class LaminadoContract extends ProcessContract {
    constructor() {
        super({
            processId: 3,
            nombre: 'Laminado',
            unidadProduccion: 'metros',
            tiposOrdenPermitidos: ['Órdenes de Laminado (Serie 3XXXXXX)'],
            maquinasPermitidas: ["Maquinaria estándar del proceso"],
            metricasObligatorias: [
                { nombre: 'adherencia', unidad: 'calificación' },
                { nombre: 'gramaje_lamina', unidad: 'g/m2' }
            ]
        });
    }
}

module.exports = LaminadoContract;
