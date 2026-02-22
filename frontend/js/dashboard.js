// Almacenar el ID del intervalo en una variable global para poder detenerlo desde otros scripts.
window.dashboardIntervalId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const elements = {
        countOrdenes: document.getElementById('count-ordenes-activas'),
        countLineas: document.getElementById('count-lineas-ejecucion'),
        countIncidentes: document.getElementById('count-incidentes-activos'),
        countRegistros: document.getElementById('count-registros-abiertos'),
        tablaOrdenesBody: document.querySelector('#tabla-ordenes-activas tbody'),
        listaIncidentes: document.getElementById('lista-incidentes-criticos'),
        alertCountBadge: document.getElementById('alert-count'),
        lastUpdatedSpan: document.getElementById('last-updated'),
        opDate: document.getElementById('op-date'),
        opShift: document.getElementById('op-shift'),
        opClock: document.getElementById('op-clock'),
        listaProcesosBitacora: document.getElementById('lista-procesos-bitacora'),
        bitacoraStatusBadge: document.getElementById('bitacora-status'),
        kpiRegistrosCard: document.getElementById('kpi-registros'),
        kpiOrdenesCard: document.getElementById('kpi-ordenes'),
        kpiLineasCard: document.getElementById('kpi-lineas'),
        kpiIncidentesCard: document.getElementById('kpi-incidentes')
    };

    function startClock() {
        setInterval(() => {
            const now = new Date();
            if (elements.opClock) {
                elements.opClock.textContent = now.toLocaleTimeString('es-ES', { hour12: false });
            }
        }, 1000);
    }

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

    async function cargarEstadoBitacora() {
        try {
            const response = await fetch('/api/bitacora/estado');
            if (response.ok) {
                const data = await response.json();

                // Badge de estado en la cabecera
                if (elements.bitacoraStatusBadge) {
                    elements.bitacoraStatusBadge.textContent = data.abierta ? 'Abierta' : 'Cerrada';
                    elements.bitacoraStatusBadge.className = `badge badge-${data.abierta ? 'success' : 'error'}`;
                }

                // Lista de procesos del turno
                if (elements.listaProcesosBitacora) {
                    if (data.abierta && data.procesos) {
                        elements.listaProcesosBitacora.innerHTML = data.procesos.map(p => `
                            <div class="compact-item">
                                <span class="compact-item-label">${p.nombre}</span>
                                <span class="badge badge-${getBadgeColor(p.estado)}">${p.estado}</span>
                            </div>
                        `).join('');
                    } else {
                        elements.listaProcesosBitacora.innerHTML = '<div class="text-center py-4 text-muted">No hay una bitácora abierta.</div>';
                    }
                }

                // Actualizar KPI de bitácora (Prioridad sobre cargarResumen)
                if (elements.countRegistros) {
                    elements.countRegistros.textContent = data.abierta ? 'Abierta' : 'Cerrada';
                    elements.countRegistros.style.fontSize = '1.25rem';

                    if (elements.kpiRegistrosCard) {
                        if (data.abierta) {
                            elements.kpiRegistrosCard.classList.add('status-normal');
                            elements.kpiRegistrosCard.classList.remove('status-critical');
                        } else {
                            elements.kpiRegistrosCard.classList.add('status-critical');
                            elements.kpiRegistrosCard.classList.remove('status-normal');
                        }
                    }
                }
            }
        } catch (e) { console.error("Error al cargar estado bitácora:", e); }
    }

    function getBadgeColor(estado) {
        if (estado.includes('Completo')) return 'success';
        if (estado.includes('Parcial')) return 'warning';
        if (estado.includes('Revisión')) return 'error';
        return 'info';
    }

    async function cargarResumen() {
        try {
            if (!window.Auth || !window.Auth.isAuthenticated()) return;

            const response = await fetch('/api/dashboard/summary');
            if (!response.ok) throw new Error('Error al cargar el resumen');
            const data = await response.json();

            // Actualizar contadores KPI
            if (elements.countOrdenes) {
                elements.countOrdenes.textContent = data.ordenesActivas;
                if (elements.kpiOrdenesCard) {
                    if (data.ordenesActivas > 0) {
                        elements.kpiOrdenesCard.classList.add('status-normal');
                        elements.kpiOrdenesCard.classList.remove('status-attention');
                    } else {
                        elements.kpiOrdenesCard.classList.add('status-attention');
                        elements.kpiOrdenesCard.classList.remove('status-normal');
                    }
                }
            }
            if (elements.countLineas) {
                elements.countLineas.textContent = data.lineasEjecucion;
                if (elements.kpiLineasCard) {
                    if (data.lineasEjecucion > 0) {
                        elements.kpiLineasCard.classList.add('status-normal');
                        elements.kpiLineasCard.classList.remove('status-attention');
                    } else {
                        elements.kpiLineasCard.classList.add('status-attention');
                        elements.kpiLineasCard.classList.remove('status-normal');
                    }
                }
            }
            if (elements.countIncidentes) {
                elements.countIncidentes.textContent = data.incidentesActivos;
                if (elements.kpiIncidentesCard) {
                    if (data.incidentesActivos > 0) {
                        elements.kpiIncidentesCard.classList.add('status-critical');
                        elements.kpiIncidentesCard.classList.remove('status-normal');
                    } else {
                        elements.kpiIncidentesCard.classList.add('status-normal');
                        elements.kpiIncidentesCard.classList.remove('status-critical');
                    }
                }
            }
            // countRegistros se maneja en cargarEstadoBitacora para consistencia

            // Actualizar tabla de órdenes
            if (elements.tablaOrdenesBody) {
                if (data.recentOrders && data.recentOrders.length > 0) {
                    elements.tablaOrdenesBody.innerHTML = data.recentOrders.map(orden => {
                        const porcentaje = orden.cantidad_objetivo > 0 ? ((orden.cantidad_producida / orden.cantidad_objetivo) * 100).toFixed(0) : 0;
                        return `
                            <tr>
                                <td><strong>${orden.codigo_orden || orden.id}</strong></td>
                                <td>${orden.producto || 'N/D'}</td>
                                <td><span class="badge badge-info">${orden.turno || 'T1'}</span></td>
                                <td><span class="badge badge-${orden.estado === 'en proceso' ? 'success' : 'warning'}">${orden.estado}</span></td>
                                <td>
                                    <div class="progress-bar-container">
                                        <div class="progress-bar">
                                            <div class="progress-bar-fill" style="width: ${porcentaje}%"></div>
                                        </div>
                                        <span class="progress-text">${porcentaje}%</span>
                                    </div>
                                </td>
                                <td><small>${orden.cantidad_producida || 0} / ${orden.cantidad_objetivo || 0}</small></td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    elements.tablaOrdenesBody.innerHTML = `
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
            if (elements.listaIncidentes) {
                if (data.criticalIncidents && data.criticalIncidents.length > 0) {
                    if (elements.alertCountBadge) {
                        elements.alertCountBadge.textContent = data.criticalIncidents.length;
                        elements.alertCountBadge.style.display = 'inline-flex';
                    }

                    elements.listaIncidentes.innerHTML = data.criticalIncidents.map(inc => `
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
                    if (elements.alertCountBadge) elements.alertCountBadge.style.display = 'none';
                    elements.listaIncidentes.innerHTML = `
                        <div class="empty-state">
                            <i data-lucide="check-circle" class="text-success large-icon"></i>
                            <p>Sistema sin alertas críticas</p>
                        </div>
                    `;
                }
            }

            // Actualizar tiempo de última actualización
            if (elements.lastUpdatedSpan) {
                const now = new Date();
                elements.lastUpdatedSpan.textContent = `Actualizado: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }

            // Cargar datos de bitácora
            await cargarEstadoBitacora();

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

    startClock();
    cargarContexto();
    cargarResumen();
    window.dashboardIntervalId = setInterval(() => {
        cargarResumen();
        cargarContexto();
    }, 30000);
});
