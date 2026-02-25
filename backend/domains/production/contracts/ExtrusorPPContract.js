const ProcessContract = require('./ProcessContract');

class ExtrusorPPContract extends ProcessContract {
    constructor() {
        super(1, 'Extrusor PP', 'kg');
    }

    parametrosObligatorios() {
        return ['temperatura', 'velocidad', 'presion'];
    }

    validarParametro(nombre, valor) {
        if (this.parametrosObligatorios().includes(nombre) && (valor === null || valor === undefined)) {
            return { valido: false, error: `${nombre} es obligatorio` };
        }
        return { valido: true };
    }
}

module.exports = ExtrusorPPContract;
