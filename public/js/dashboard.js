document.addEventListener('DOMContentLoaded', () => {
    const fetchButton = document.getElementById('fetchDashboard');
    const ordenIdInput = document.getElementById('ordenId');
    const dashboardContainer = document.getElementById('dashboard-container');

    fetchButton.addEventListener('click', async () => {
        const ordenId = ordenIdInput.value;
        if (!ordenId) {
            dashboardContainer.innerHTML = '<div class="card" style="text-align: center; color: var(--danger);">Por favor, ingrese un ID de orden.</div>';
            return;
        }

        dashboardContainer.innerHTML = '<div class="card" style="text-align: center; color: var(--text-muted);">Cargando datos...</div>';

        try {
            const response = await fetch(`/api/dashboard/orden-produccion/${ordenId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error del servidor: ${response.status}`);
            }
            
            const data = await response.json();
            renderDashboard(data);

        } catch (error) {
            dashboardContainer.innerHTML = `<div class="card" style="text-align: center; color: var(--danger);">Error al cargar el dashboard: ${error.message}</div>`;
            console.error('Error al obtener el dashboard:', error);
        }
    });

    function renderDashboard(data) {
        const { orden_produccion, lineas_ejecucion, lotes_produccion } = data;

        let html = '';

        // 1. Resumen de la Orden
        html += `
            <div class="card">
                <div class="card-title">
                    <span>Resumen de la Orden: ${orden_produccion.producto}</span>
                    <span class="badge ${orden_produccion.estado.toLowerCase() === 'completado' ? 'badge-success' : 'badge-info'}">${orden_produccion.estado}</span>
                </div>
                <div class="dashboard-grid">
                    <div class="stat-card">
                        <span class="stat-label">ID de Orden</span>
                        <span class="stat-value">#${orden_produccion.id}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Cantidad Objetivo</span>
                        <span class="stat-value">${orden_produccion.cantidad}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Fecha de Inicio</span>
                        <span class="stat-value" style="font-size: 1.1rem;">${new Date(orden_produccion.fecha_inicio).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `;

        // 2. Líneas de Ejecución y Avance
        html += `
            <div class="card">
                <div class="card-title">Seguimiento de Procesos</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Línea ID</th>
                                <th>Proceso ID</th>
                                <th>Registros de Trabajo</th>
                                <th>Total Producido</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (lineas_ejecucion.length > 0) {
            lineas_ejecucion.forEach(linea => {
                const totalProducido = (linea.registros_trabajo || []).reduce((sum, reg) => sum + reg.cantidad_producida, 0);
                html += `
                    <tr>
                        <td><strong>${linea.id}</strong></td>
                        <td>${linea.proceso_tipo_id}</td>
                        <td>${linea.registros_trabajo ? linea.registros_trabajo.length : 0} registros</td>
                        <td><span class="text-success" style="font-weight: 600;">${totalProducido}</span></td>
                    </tr>
                `;
            });
        } else {
            html += '<tr><td colspan="4" style="text-align: center;">No hay líneas de ejecución iniciadas.</td></tr>';
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // 3. Lotes y Calidad
        html += `
            <div class="card">
                <div class="card-title">Control de Calidad y Lotes</div>
                <div class="dashboard-grid">
        `;

        if (lotes_produccion.length > 0) {
            lotes_produccion.forEach(lote => {
                const totalMuestras = lote.muestras_calidad ? lote.muestras_calidad.length : 0;
                const aprobadas = (lote.muestras_calidad || []).filter(m => m.resultado === 'aprobado').length;

                html += `
                    <div class="stat-card" style="border-left: 4px solid var(--primary-color);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                            <span style="font-weight: 600;">Lote #${lote.id}</span>
                            <span class="stat-label">${new Date(lote.fecha_creacion).toLocaleDateString()}</span>
                        </div>
                        <div style="margin-top: 0.5rem;">
                            <span class="stat-label">Muestras de Calidad:</span>
                            <div style="display: flex; gap: 1rem; margin-top: 0.25rem;">
                                <span>Total: <strong>${totalMuestras}</strong></span>
                                <span class="text-success">Aprobadas: <strong>${aprobadas}</strong></span>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">No se han generado lotes para esta orden.</div>';
        }

        html += `
                </div>
            </div>
        `;

        dashboardContainer.innerHTML = html;
    }
});