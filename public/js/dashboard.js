// Almacenar el ID del intervalo en una variable global para poder detenerlo desde otros scripts.
window.dashboardIntervalId = null;

document.addEventListener('DOMContentLoaded', () => {
    const countOrdenes = document.getElementById('count-ordenes-activas');
    const countLineas = document.getElementById('count-lineas-ejecucion');
    const countIncidentes = document.getElementById('count-incidentes-activos');
    const countRegistros = document.getElementById('count-registros-abiertos');

    const tablaOrdenesBody = document.querySelector('#tabla-ordenes-activas tbody');
    const listaIncidentes = document.getElementById('lista-incidentes-criticos');
    const alertCountBadge = document.getElementById('alert-count');
    const lastUpdatedSpan = document.getElementById('last-updated');

    async function cargarResumen() {
        try {
            if (!window.Auth || !window.Auth.isAuthenticated()) return;

            const response = await fetch('/api/dashboard/summary');
            if (!response.ok) throw new Error('Error al cargar el resumen');
            const data = await response.json();

            // Actualizar contadores KPI
            if (countOrdenes) countOrdenes.textContent = data.ordenesActivas;
            if (countLineas) countLineas.textContent = data.lineasEjecucion;
            if (countIncidentes) {
                countIncidentes.textContent = data.incidentesActivos;
                const card = document.getElementById('kpi-incidentes');
                if (data.incidentesActivos > 0) {
                    card.classList.add('status-critical');
                    card.classList.remove('status-normal');
                } else {
                    card.classList.add('status-normal');
                    card.classList.remove('status-critical');
                }
            }
            if (countRegistros) countRegistros.textContent = data.registrosAbiertos;

            // Actualizar tabla de órdenes
            if (tablaOrdenesBody) {
                if (data.recentOrders && data.recentOrders.length > 0) {
                    tablaOrdenesBody.innerHTML = data.recentOrders.map(orden => `
                        <tr>
                            <td><strong>${orden.codigo || orden.id}</strong></td>
                            <td>${orden.producto || 'N/D'}</td>
                            <td>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-bar-fill" style="width: ${orden.cantidad_objetivo > 0 ? ((orden.cantidad_producida / orden.cantidad_objetivo) * 100).toFixed(0) : 0}%"></div>
                                    </div>
                                    <span class="progress-text">${orden.cantidad_objetivo > 0 ? ((orden.cantidad_producida / orden.cantidad_objetivo) * 100).toFixed(0) : 0}%</span>
                                </div>
                            </td>
                            <td>${orden.turno || 'N/D'}</td>
                            <td><span class="badge badge-${orden.estado === 'en proceso' ? 'info' : 'warning'}">${orden.estado}</span></td>
                        </tr>
                    `).join('');
                } else {
                    tablaOrdenesBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center py-8">
                                <div class="empty-state">
                                    <p>No hay órdenes en ejecución en este momento</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }

            // Actualizar incidentes críticos
            if (listaIncidentes) {
                if (data.criticalIncidents && data.criticalIncidents.length > 0) {
                    alertCountBadge.textContent = data.criticalIncidents.length;
                    alertCountBadge.style.display = 'inline-flex';

                    listaIncidentes.innerHTML = data.criticalIncidents.map(inc => `
                        <div class="alert-item">
                            <div class="alert-header">
                                <span class="alert-type">${inc.tipo || 'Incidente'}</span>
                                <span class="alert-time">${formatRelativeTime(inc.fecha_creacion)}</span>
                            </div>
                            <div class="alert-body">
                                <p class="alert-desc">${inc.descripcion}</p>
                                <span class="alert-process">${inc.proceso || 'General'}</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    alertCountBadge.style.display = 'none';
                    listaIncidentes.innerHTML = `
                        <div class="empty-state">
                            <i data-lucide="check-circle" class="text-success large-icon"></i>
                            <p>Sistema sin alertas críticas</p>
                        </div>
                    `;
                }
            }

            // Actualizar tiempo de última actualización
            if (lastUpdatedSpan) {
                const now = new Date();
                lastUpdatedSpan.textContent = `Actualizado: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }

            // Re-inicializar iconos de Lucide para los nuevos elementos
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
    window.dashboardIntervalId = setInterval(cargarResumen, 30000);
});
