/**
 * Interfaz base para contratos de procesos productivos.
 * Define el comportamiento estático y reglas de validación para cada proceso.
 */
const AppError = require('../../../shared/errors/AppError');

class ProcessContract {
    constructor(processId, nombre, unidadProduccion) {
        if (this.constructor === ProcessContract) {
            throw new AppError("No se puede instanciar la clase abstracta ProcessContract.", 500);
        }
        this.processId = processId;
        this.nombre = nombre;
        this.unidadProduccion = unidadProduccion;
    }

    /**
     * Valida si la unidad de medida proporcionada es correcta para este proceso.
     * @param {string} unidad
     * @returns {boolean}
     */
    validaUnidad(unidad) {
        return unidad === this.unidadProduccion;
    }

    /**
     * Retorna la lista de parámetros técnicos obligatorios para este proceso.
     * @returns {string[]}
     */
    parametrosObligatorios() {
        return [];
    }

    /**
     * Valida un parámetro específico según las reglas del contrato.
     * @param {string} nombre
     * @param {any} valor
     * @returns {{valido: boolean, error?: string}}
     */
    validarParametro(nombre, valor) {
        return { valido: true };
    }
}

module.exports = ProcessContract;
