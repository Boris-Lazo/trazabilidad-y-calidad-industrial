// Almacenar el ID del intervalo en una variable global para poder detenerlo desde otros scripts.
window.dashboardIntervalId = null;

document.addEventListener('DOMContentLoaded', () => {
    const countOrdenes = document.getElementById('count-ordenes-activas');
    const countLineas = document.getElementById('count-lineas-ejecucion');
    const countIncidentes = document.getElementById('count-incidentes-activos');
    const countRegistros = document.getElementById('count-registros-abiertos');

    const tablaOrdenesBody = document.querySelector('#tabla-ordenes-activas tbody');
    const listaIncidentes = document.getElementById('lista-incidentes-criticos');

    async function cargarResumen() {
        try {
            // No intentar cargar datos si no hay sesión (puede ocurrir justo después de logout)
            if (!Auth || !Auth.isAuthenticated()) return;

            const response = await fetch('/api/dashboard/summary');
            if (!response.ok) throw new Error('Error al cargar el resumen');
            const data = await response.json();

            // ... (resto del código para actualizar la interfaz)

        } catch (error) {
            console.error('Error en la carga del resumen del dashboard:', error);
            // Si hay un error (ej. 401), es mejor detener las actualizaciones para evitar bucles.
            if (window.dashboardIntervalId) {
                clearInterval(window.dashboardIntervalId);
            }
        }
    }

    cargarResumen();
    // Guardar el ID para poder limpiarlo después.
    window.dashboardIntervalId = setInterval(cargarResumen, 30000);
});