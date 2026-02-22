// Almacenar el ID del intervalo en una variable global para poder detenerlo desde otros scripts.
window.dashboardIntervalId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const elements = {
        countOrdenes: document.getElementById('count-ordenes-activas'),
        countIncidentes: document.getElementById('count-incidentes-activos'),
        countProduccionDia: document.getElementById('count-produccion-dia'),
        alertCountTotal: document.getElementById('alert-count-total'),
        tablaOrdenesBody: document.querySelector('#tabla-ordenes-activas tbody'),
        listaIncidentes: document.getElementById('lista-incidentes-criticos'),
        lastUpdatedSpan: document.getElementById('last-updated')
    };

    async function cargarContexto() {
        try {
            const response = await fetch('/api/bitacora/tiempo-actual');
            if (response.ok) {
                const data = await response.json();
                if (elements.opDate) elements.opDate.textContent = data.fechaOperativa || data.fecha;
                if (elements.opShift) elements.opShift.textContent = `Turno ${data.turno}`;
            }
        } catch (e) { console.error("Error al cargar contexto:", e); }
    }

    async function cargarResumen() {
        try {
            if (!window.Auth || !window.Auth.isAuthenticated()) return;

            const response = await fetch('/api/dashboard/summary');
            if (!response.ok) throw new Error('Error al cargar el resumen');
            const data = await response.json();

            // Actualizar contadores KPI
            if (elements.countOrdenes) elements.countOrdenes.textContent = data.ordenesActivas;
            if (elements.countIncidentes) elements.countIncidentes.textContent = data.incidentesActivos;
            if (elements.countProduccionDia) elements.countProduccionDia.textContent = `${data.produccionDia} kg`;
            if (elements.alertCountTotal) elements.alertCountTotal.textContent = data.criticalIncidents ? data.criticalIncidents.length : 0;

            // Actualizar tabla de órdenes
            if (elements.tablaOrdenesBody) {
                if (data.recentOrders && data.recentOrders.length > 0) {
                    elements.tablaOrdenesBody.innerHTML = data.recentOrders.map(orden => {
                        const porcentaje = orden.cantidad_objetivo > 0 ? ((orden.cantidad_producida / orden.cantidad_objetivo) * 100).toFixed(0) : 0;
                        return `
                            <tr>
                                <td><strong>${orden.codigo_orden || orden.id}</strong></td>
                                <td>${orden.producto || 'N/D'}</td>
                                <td><span class="badge badge-${orden.estado === 'en proceso' ? 'success' : 'warning'}">${orden.estado}</span></td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <div style="flex:1; height:6px; background:#EEE; border-radius:3px; overflow:hidden;">
                                            <div style="width:${porcentaje}%; height:100%; background:var(--primary);"></div>
                                        </div>
                                        <span style="font-size:12px; font-weight:600;">${porcentaje}%</span>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    elements.tablaOrdenesBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-secondary">No hay órdenes activas</td></tr>';
                }
            }

            // Actualizar incidentes críticos
            if (elements.listaIncidentes) {
                if (data.criticalIncidents && data.criticalIncidents.length > 0) {
                    elements.listaIncidentes.innerHTML = data.criticalIncidents.map(inc => `
                        <div style="padding:12px; border-bottom:1px solid var(--border-light);">
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <span class="badge badge-error">${inc.tipo || 'Alerta'}</span>
                                <small>${formatRelativeTime(inc.fecha_creacion)}</small>
                            </div>
                            <p style="margin:0; font-size:14px;">${inc.descripcion}</p>
                        </div>
                    `).join('');
                } else {
                    elements.listaIncidentes.innerHTML = '<div class="text-center py-4 text-secondary">No hay alertas críticas</div>';
                }
            }

            // Actualizar tiempo de última actualización
            if (elements.lastUpdatedSpan) {
                const now = new Date();
                elements.lastUpdatedSpan.textContent = `Actualizado: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }

            if (window.lucide) window.lucide.createIcons();

        } catch (error) {
            console.error('Error en la carga del resumen del dashboard:', error);
            if (window.dashboardIntervalId && error.message.includes('401')) {
                clearInterval(window.dashboardIntervalId);
            }
        }
    }

    function formatRelativeTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now - date;
        const diffInMins = Math.floor(diffInMs / 60000);

        if (diffInMins < 1) return 'Hace un momento';
        if (diffInMins < 60) return `Hace ${diffInMins} min`;
        const diffInHours = Math.floor(diffInMins / 60);
        if (diffInHours < 24) return `Hace ${diffInHours} h`;
        return date.toLocaleDateString();
    }

    cargarResumen();
    window.dashboardIntervalId = setInterval(() => {
        cargarResumen();
    }, 30000);
});
