
document.addEventListener('DOMContentLoaded', () => {
    const countOrdenes = document.getElementById('count-ordenes-activas');
    const countLineas = document.getElementById('count-lineas-ejecucion');
    const countIncidentes = document.getElementById('count-incidentes-activos');
    const countRegistros = document.getElementById('count-registros-abiertos');

    const tablaOrdenesBody = document.querySelector('#tabla-ordenes-activas tbody');
    const listaIncidentes = document.getElementById('lista-incidentes-criticos');

    async function cargarResumen() {
        try {
            const response = await fetch('/api/dashboard/summary');
            if (!response.ok) throw new Error('Error al cargar el resumen');
            const data = await response.json();

            // Actualizar Contadores
            countOrdenes.textContent = data.ordenesActivas;
            countLineas.textContent = data.lineasEjecucion;
            countIncidentes.textContent = data.incidentesActivos;
            countRegistros.textContent = data.registrosAbiertos;

            // Actualizar Tabla de Órdenes
            tablaOrdenesBody.innerHTML = '';
            if (data.recentOrders.length === 0) {
                tablaOrdenesBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay órdenes activas</td></tr>';
            } else {
                data.recentOrders.forEach(orden => {
                    const pct = orden.cantidad_objetivo ? Math.min(Math.round((orden.cantidad_producida / orden.cantidad_objetivo) * 100), 100) : 0;
                    const fila = `
                        <tr>
                            <td><strong>#${orden.codigo_orden || orden.id}</strong></td>
                            <td>${orden.producto || 'N/A'}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="flex: 1; background: var(--border-color); height: 8px; border-radius: 4px; overflow: hidden; min-width: 100px;">
                                        <div style="width: ${pct}%; background: var(--primary-color); height: 100%;"></div>
                                    </div>
                                    <span style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; font-family: var(--font-mono);">
                                        ${orden.cantidad_producida} / ${orden.cantidad_objetivo}
                                    </span>
                                </div>
                            </td>
                            <td><span class="badge badge-warning">${orden.estado}</span></td>
                        </tr>
                    `;
                    tablaOrdenesBody.innerHTML += fila;
                });
            }

            // Actualizar Incidentes Críticos
            listaIncidentes.innerHTML = '';
            if (data.criticalIncidents.length === 0) {
                listaIncidentes.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Sin alertas activas.</p>';
            } else {
                data.criticalIncidents.forEach(incidente => {
                    const item = `
                        <div class="stat-card" style="border-left: 4px solid var(--danger); padding: 0.75rem;">
                            <div style="font-weight: 600; font-size: 0.9rem;">${incidente.titulo}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${incidente.descripcion}</div>
                            <div style="font-size: 0.75rem; margin-top: 0.5rem; display: flex; justify-content: space-between;">
                                <span class="badge badge-error">Crítico</span>
                                <span>${new Date(incidente.fecha_creacion).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    `;
                    listaIncidentes.innerHTML += item;
                });
            }

        } catch (error) {
            console.error('Error:', error);
        }
    }

    cargarResumen();
    // Recargar cada 30 segundos
    setInterval(cargarResumen, 30000);
});
