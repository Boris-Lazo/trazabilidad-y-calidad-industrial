
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
            const data = await response.json();

            const orden = data.orden_produccion;

            // Título y Estado
            document.getElementById('detalle-titulo').textContent = `Orden #${orden.codigo_orden || orden.id}`;
            document.getElementById('detalle-estado').innerHTML = `<span class="badge badge-warning">${orden.estado}</span>`;

            // Info General
            const infoGeneral = document.getElementById('info-general');
            infoGeneral.innerHTML = `
                <div>
                    <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Producto</label>
                    <div style="font-weight: 600;">${orden.producto || 'N/A'}</div>
                </div>
                <div>
                    <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Cantidad Objetivo</label>
                    <div>${orden.cantidad_objetivo || 0} ${orden.unidad || ''}</div>
                </div>
                <div>
                    <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Fecha Planificada</label>
                    <div>${orden.fecha_planificada ? new Date(orden.fecha_planificada).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                    <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Prioridad</label>
                    <div style="text-transform: capitalize;">${orden.prioridad || 'media'}</div>
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
                tablaLineas.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay líneas asociadas</td></tr>';
            } else {
                data.lineas_ejecucion.forEach(linea => {
                    let lineaProducido = 0;
                    if (linea.registros_trabajo) {
                        linea.registros_trabajo.forEach(r => lineaProducido += (r.cantidad_producida || 0));
                    }
                    const pct = orden.cantidad_objetivo ? Math.min(Math.round((lineaProducido / orden.cantidad_objetivo) * 100), 100) : 0;

                    const fila = `
                        <tr>
                            <td><strong>Proceso #${linea.proceso_tipo_id}</strong></td>
                            <td><span class="badge badge-info">${linea.estado}</span></td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="flex: 1; background: var(--border-color); height: 6px; border-radius: 3px; overflow: hidden; min-width: 80px;">
                                        <div style="width: ${pct}%; background: var(--success); height: 100%;"></div>
                                    </div>
                                    <span style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; font-family: var(--font-mono);">
                                        ${lineaProducido} / ${orden.cantidad_objetivo}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <a href="/ejecucion.html?lineaId=${linea.id}" class="button button-outline" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">Operar</a>
                            </td>
                        </tr>
                    `;
                    tablaLineas.innerHTML += fila;
                });
            }

            // Historial (Simulado o real si tuviéramos tabla auditoría)
            const historial = document.getElementById('historial-eventos');
            historial.innerHTML = `
                <div style="border-left: 2px solid var(--primary-color); padding-left: 1rem; position: relative;">
                    <div style="font-size: 0.8rem; font-weight: 600;">Orden Creada</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${new Date(orden.fecha_creacion).toLocaleString()}</div>
                </div>
            `;

        } catch (error) {
            console.error('Error:', error);
        }
    }

    cargarDetalles();
});
