/**
 * TURNO SCHEDULER — PROD-SYS
 * backend/shared/scheduler/turnoScheduler.js
 *
 * Avanza automáticamente los turnos de grupos operativos cada lunes a las 00:05 AM.
 * No requiere dependencias externas — usa setInterval nativo de Node.js.
 *
 * Lógica:
 *   - turno_actual  ← turno_siguiente  (o CICLO[turno_actual] si turno_siguiente es NULL)
 *   - turno_siguiente ← CICLO[nuevo turno_actual]
 *
 * El ajuste manual en el frontend sigue funcionando sin restricciones.
 * El scheduler solo actúa una vez por semana (guarda la última semana procesada).
 */

const { logger } = require('../logger/logger');

// Ciclo oficial de rotación
const CICLO = { T1: 'T3', T3: 'T2', T2: 'T1' };

/**
 * Retorna el número de semana ISO y el año de una fecha
 */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return { week, year: d.getUTCFullYear() };
}

/**
 * Ejecuta la rotación de turnos para todos los grupos operativos.
 * Es idempotente: si ya se ejecutó esta semana, no hace nada.
 */
async function rotarTurnos(db) {
    try {
        const now = new Date();
        const { week, year } = getISOWeek(now);
        const semanaKey = `${year}-W${String(week).padStart(2, '0')}`;

        // Verificar si ya se procesó esta semana
        const config = await db.get(
            `SELECT valor FROM sistema_config WHERE clave = 'turno_ultima_rotacion_automatica'`
        );

        if (config && config.valor === semanaKey) {
            logger.info(`[TurnoScheduler] Rotación ya ejecutada para ${semanaKey}, omitiendo.`);
            return;
        }

        // Obtener grupos operativos activos
        const grupos = await db.query(
            `SELECT id, nombre, turno_actual, turno_siguiente FROM grupos WHERE tipo = 'operativo' AND activo = 1`
        );

        if (!grupos || grupos.length === 0) {
            logger.warn('[TurnoScheduler] No se encontraron grupos operativos activos.');
            return;
        }

        logger.info(`[TurnoScheduler] Iniciando rotación automática para semana ${semanaKey} — ${grupos.length} grupos`);

        for (const grupo of grupos) {
            const nuevoActual   = grupo.turno_siguiente || CICLO[grupo.turno_actual] || grupo.turno_actual;
            const nuevoSiguiente = CICLO[nuevoActual] || nuevoActual;

            await db.run(
                `UPDATE grupos SET turno_actual = ?, turno_siguiente = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [nuevoActual, nuevoSiguiente, grupo.id]
            );

            logger.info(
                `[TurnoScheduler] ${grupo.nombre}: ${grupo.turno_actual} → ${nuevoActual} (próx: ${nuevoSiguiente})`
            );
        }

        // Registrar que esta semana ya fue procesada
        await db.run(
            `INSERT INTO sistema_config (clave, valor) VALUES (?, ?)
             ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
            ['turno_ultima_rotacion_automatica', semanaKey]
        );

        logger.info(`[TurnoScheduler] Rotación completada para ${semanaKey}`);

    } catch (err) {
        logger.error('[TurnoScheduler] Error en rotación automática:', err.message);
    }
}

/**
 * Calcula los milisegundos hasta el próximo lunes a las 00:05 AM (hora local)
 */
function msHastaProximoLunes() {
    const now = new Date();
    const proximoLunes = new Date(now);

    // Avanzar hasta el próximo lunes
    const diaSemana = now.getDay(); // 0=dom, 1=lun, ..., 6=sab
    const diasHastaLunes = diaSemana === 1 ? 7 : (8 - diaSemana) % 7 || 7;
    proximoLunes.setDate(now.getDate() + diasHastaLunes);
    proximoLunes.setHours(0, 5, 0, 0); // 00:05:00

    return proximoLunes - now;
}

/**
 * Inicia el scheduler. Llamar una vez desde server.js después de initDB().
 *
 * @param {object} db — el módulo sqlite exportado (con .query, .get, .run)
 */
function iniciarTurnoScheduler(db) {
    const now = new Date();
    const { week, year } = getISOWeek(now);

    // Ejecutar inmediatamente si hoy es lunes y aún no se rotó esta semana
    if (now.getDay() === 1) {
        logger.info('[TurnoScheduler] Hoy es lunes — verificando si se necesita rotación...');
        rotarTurnos(db);
    }

    // Programar el próximo lunes
    const ms = msHastaProximoLunes();
    const horas = Math.round(ms / 3600000);
    logger.info(`[TurnoScheduler] Próxima rotación automática en ~${horas}h (próximo lunes 00:05)`);

    setTimeout(function tick() {
        rotarTurnos(db);
        // Volver a programar para el lunes siguiente (7 días)
        setTimeout(tick, 7 * 24 * 60 * 60 * 1000);
    }, ms);
}

module.exports = { iniciarTurnoScheduler, rotarTurnos };