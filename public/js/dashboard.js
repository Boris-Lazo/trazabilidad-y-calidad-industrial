document.addEventListener('DOMContentLoaded', () => {
    const fetchButton = document.getElementById('fetchDashboard');
    const ordenIdInput = document.getElementById('ordenId');
    const dashboardContainer = document.getElementById('dashboard-container');

    const fetchDashboard = async () => {
        const ordenId = ordenIdInput.value;
        if (!ordenId) {
            dashboardContainer.innerHTML = '<p class="placeholder">Por favor, ingrese un ID de orden.</p>';
            return;
        }

        // Estado de carga: Deshabilitar botón y mostrar spinner
        fetchButton.disabled = true;
        fetchButton.innerHTML = '<span class="spinner"></span> Consultando...';
        dashboardContainer.innerHTML = '<p class="placeholder">Cargando datos del sistema...</p>';

        try {
            const response = await fetch(`/api/dashboard/orden-produccion/${ordenId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error del servidor: ${response.status}`);
            }
            
            const data = await response.json();
            renderDashboard(data);

        } catch (error) {
            dashboardContainer.innerHTML = `<p class="placeholder error">⚠️ Error al cargar el dashboard: ${error.message}</p>`;
            console.error('Error al obtener el dashboard:', error);
        } finally {
            // Restaurar estado del botón
            fetchButton.disabled = false;
            fetchButton.innerHTML = 'Consultar Dashboard';
        }
    };

    fetchButton.addEventListener('click', fetchDashboard);

    // Soporte para tecla "Enter" (Accesibilidad y Eficiencia)
    ordenIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            fetchDashboard();
        }
    });

    function renderDashboard(data) {
        const { orden_produccion, lineas_ejecucion, lotes_produccion } = data;
        let html = '<h2>Dashboard de la Orden de Producción</h2>';

        // Renderizar Orden de Producción
        html += '<div class="card">';
        html += `<h3>Orden: ${orden_produccion.producto} (ID: ${orden_produccion.id})</h3>`;
        html += `<p><strong>Cantidad:</strong> ${orden_produccion.cantidad}</p>`;
        html += `<p><strong>Fecha de Inicio:</strong> ${new Date(orden_produccion.fecha_inicio).toLocaleDateString()}</p>`;
        html += `<p><strong>Estado:</strong> ${orden_produccion.estado}</p>`;
        html += '</div>';

        // Renderizar Líneas de Ejecución
        html += '<h3>Líneas de Ejecución</h3>';
        if (lineas_ejecucion.length > 0) {
            html += '<div class="grid">';
            lineas_ejecucion.forEach(linea => {
                html += '<div class="card">';
                html += `<h4>Línea ID: ${linea.id}</h4>`;
                html += `<p><strong>Proceso:</strong> (ID de Proceso: ${linea.proceso_tipo_id})</p>`;
                html += `<h5>Registros de Trabajo:</h5>`;
                if (linea.registros_trabajo && linea.registros_trabajo.length > 0) {
                    html += '<ul>';
                    linea.registros_trabajo.forEach(registro => {
                        html += `<li>ID: ${registro.id} - Cantidad: ${registro.cantidad_producida}</li>`;
                    });
                    html += '</ul>';
                } else {
                    html += '<p>No hay registros de trabajo.</p>';
                }
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<p>No hay líneas de ejecución para esta orden.</p>';
        }

        // Renderizar Lotes de Producción y Muestras de Calidad
        html += '<h3>Lotes y Control de Calidad</h3>';
        if (lotes_produccion.length > 0) {
            html += '<div class="grid">';
            lotes_produccion.forEach(lote => {
                html += '<div class="card">';
                html += `<h4>Lote ID: ${lote.id}</h4>`;
                html += `<p><strong>Fecha:</strong> ${new Date(lote.fecha_creacion).toLocaleDateString()}</p>`;
                html += `<h5>Muestras de Calidad:</h5>`;
                if (lote.muestras_calidad && lote.muestras_calidad.length > 0) {
                    html += '<ul>';
                    lote.muestras_calidad.forEach(muestra => {
                        html += `<li>ID: ${muestra.id} - Resultado: ${muestra.resultado}</li>`;
                    });
                    html += '</ul>';
                } else {
                    html += '<p>No hay muestras de calidad.</p>';
                }
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<p>No hay lotes de producción para esta orden.</p>';
        }

        dashboardContainer.innerHTML = html;
    }
});