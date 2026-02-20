
/**
 * Utilidades para el manejo de turnos y fecha operativa.
 */

const SHIFTS = {
    T1: { start: 7, end: 15 },
    T2: { start: 15, end: 23 },
    T3: { start: 23, end: 7 }
};

/**
 * Obtiene el turno y la fecha operativa basada en una fecha/hora dada.
 * @param {Date} date - La fecha y hora a evaluar.
 * @returns {Object} - { turno, fechaOperativa }
 */
function getTurnoActual(date = new Date()) {
    const hours = date.getHours();
    let turno = '';
    let fechaOperativa = new Date(date);

    if (hours >= 7 && hours < 15) {
        turno = 'T1';
    } else if (hours >= 15 && hours < 23) {
        turno = 'T2';
    } else {
        turno = 'T3';
        // Si son entre las 00:00 y las 06:59, la fecha operativa es el día anterior
        if (hours < 7) {
            fechaOperativa.setDate(fechaOperativa.getDate() - 1);
        }
    }

    const year = fechaOperativa.getFullYear();
    const month = String(fechaOperativa.getMonth() + 1).padStart(2, '0');
    const day = String(fechaOperativa.getDate()).padStart(2, '0');

    return {
        turno,
        fechaOperativa: `${year}-${month}-${day}`
    };
}

module.exports = {
    getTurnoActual,
    SHIFTS
};
