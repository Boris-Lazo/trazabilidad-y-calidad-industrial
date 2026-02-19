
function getOperationalInfo(date = new Date()) {
    const hours = date.getHours();
    let operationalDate = new Date(date);
    let shift = '';

    if (hours >= 7 && hours < 15) {
        shift = 'T1';
    } else if (hours >= 15 && hours < 23) {
        shift = 'T2';
    } else {
        shift = 'T3';
        // Si estamos entre las 00:00 y las 06:59, la fecha operativa es el día anterior
        if (hours < 7) {
            operationalDate.setDate(operationalDate.getDate() - 1);
        }
    }

    return {
        fecha_operativa: operationalDate.toISOString().split('T')[0],
        turno: shift
    };
}

module.exports = { getOperationalInfo };
