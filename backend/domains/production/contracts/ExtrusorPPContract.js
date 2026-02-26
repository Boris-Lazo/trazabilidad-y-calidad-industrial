const ProcessContract = require('./ProcessContract');

class ExtrusorPPContract extends ProcessContract {
    constructor() {
        super({
            processId: 1,
            nombre: 'Extrusor PP',
            unidadProduccion: 'kg',
            tiposOrdenPermitidos: ['Órdenes de Extrusión PP (Serie 1XXXXXX)'],
            maquinasPermitidas: ['Extrusora Principal EXT-01', 'Extrusora de Respaldo EXT-02'],
            metricasObligatorias: [
                { nombre: 'temperatura', unidad: '°C' },
                { nombre: 'velocidad', unidad: 'RPM' },
                { nombre: 'presion', unidad: 'bar' },
                { nombre: 'denier', unidad: 'g/9000m' },
                { nombre: 'tenacidad', unidad: 'gf/den' }
            ],
            motivo: 'Definición base para extrusión de polipropileno'
        });
    }
}

module.exports = ExtrusorPPContract;
