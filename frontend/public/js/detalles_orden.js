
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ordenId = urlParams.get('id');

    if (!ordenId) {
        window.location.href = '/ordenes.html';
        return;
    }

    async function cargarDetalles() {
        try {
            const response = await fetch(`/api/dashboard/orden-produccion/${ordenId}`);
            if (!response.ok) throw new Error('No se pudo cargar la orden');
            const result = await response.json();
            const data = result.data || {};

            const orden = data.orden_produccion;

            // Título y Estado
            document.getElementById('detalle-titulo').textContent = `Orden #${orden.codigo_orden || orden.id}`;
            document.getElementById('detalle-estado').innerHTML = `<span class="badge badge-warning">${orden.estado}</span>`;

            // Info General
            const infoGeneral = document.getElementById('info-general');
            infoGeneral.innerHTML = `
                <div>
                    <label class="text-muted font-xs uppercase">Producto</label>
                    <div class="text-bold">${orden.producto || 'N/A'}</div>
                </div>
                <div>
                    <label class="text-muted font-xs uppercase">Cantidad Objetivo</label>
                    <div>${orden.cantidad_objetivo || 0} ${orden.unidad || ''}</div>
                </div>
                <div>
                    <label class="text-muted font-xs uppercase">Fecha Planificada</label>
                    <div>${orden.fecha_planificada ? new Date(orden.fecha_planificada).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                    <label class="text-muted font-xs uppercase">Prioridad</label>
                    <div class="capitalize">${orden.prioridad || 'media'}</div>
                </div>
            `;

            // Resumen Producción (Agregado de lo que ya tenemos en data)
            const resumen = document.getElementById('resumen-produccion');
            let totalProducido = 0;
            data.lineas_ejecucion.forEach(l => {
                l.registros_trabajo.forEach(r => {
                    totalProducido += (r.cantidad_producida || 0);
                });
            });

            resumen.innerHTML = `
                <div class="stat-card">
                    <div class="stat-label">Total Producido</div>
                    <div class="stat-value">${totalProducido}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Eficiencia</div>
                    <div class="stat-value">${orden.cantidad_objetivo ? Math.round((totalProducido / orden.cantidad_objetivo) * 100) : 0}%</div>
                </div>
            `;

            // Líneas de Ejecución
            const tablaLineas = document.querySelector('#tabla-lineas tbody');
            tablaLineas.innerHTML = '';
            if (data.lineas_ejecucion.length === 0) {
                tablaLineas.innerHTML = '<tr><td colspan="4" class="text-center">No hay líneas asociadas</td></tr>';
            } else {
                data.lineas_ejecucion.forEach(linea => {
                    const fila = `
                        <tr>
                            <td><strong>Proceso #${linea.proceso_id}</strong></td>
                            <td><span class="badge badge-info">${linea.estado}</span></td>
                            <td>
                                <div class="progress-bar-container">
                                    <div class="progress-bar-fill w-60"></div>
                                </div>
                            </td>
                            <td>
                                <a href="/ejecucion.html?lineaId=${linea.id}" class="button button-outline font-xs p-1">Operar</a>
                            </td>
                        </tr>
                    `;
                    tablaLineas.innerHTML += fila;
                });
            }

            // Historial (Simulado o real si tuviéramos tabla auditoría)
            const historial = document.getElementById('historial-eventos');
            historial.innerHTML = `
                <div class="historial-event-item">
                    <div class="font-sm text-bold">Orden Creada</div>
                    <div class="font-xs text-muted">${new Date(orden.fecha_creacion).toLocaleString()}</div>
                </div>
            `;

        } catch (error) {
            console.error('Error:', error);
        }
    }

    cargarDetalles();
});
