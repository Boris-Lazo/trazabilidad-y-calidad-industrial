
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('telares-container');
    const urlParams = new URLSearchParams(window.location.search);
    const bitacoraId = urlParams.get('id');

    if (!bitacoraId) {
        window.location.href = 'bitacora.html';
        return;
    }

    async function loadResumen() {
        try {
            const response = await fetch(`/api/telares/resumen?bitacora_id=${bitacoraId}`);
            const result = await response.json();

            if (result.success) {
                renderTelares(result.data);
            } else {
                container.innerHTML = `<div class="text-error">Error: ${result.error}</div>`;
            }
        } catch (error) {
            console.error('Error cargando resumen:', error);
            container.innerHTML = `<div class="text-error">Error de conexión al servidor</div>`;
        }
    }

    function renderTelares(telares) {
        container.innerHTML = '';

        // Calcular métricas globales
        const produccionTotal = telares.reduce((acc, t) => acc + (parseFloat(t.produccionTotal) || 0), 0);
        const cumplimientoGlobal = (telares.reduce((acc, t) => acc + (parseFloat(t.cumplimiento) || 0), 0) / telares.length).toFixed(1);

        document.getElementById('resumen-global').innerHTML = `
            <div class="metric-item">
                <span class="metric-value">${produccionTotal.toLocaleString()} m</span>
                <span class="metric-label">Producción Total</span>
            </div>
            <div class="metric-item">
                <span class="metric-value">${cumplimientoGlobal}%</span>
                <span class="metric-label">Cumplimiento Calidad</span>
            </div>
        `;

        telares.forEach(t => {
            const card = document.createElement('div');
            card.className = 'telar-card';

            // Lógica de Semáforos
            let statusBadgeClass = 'badge-outline';
            let cardBorderStyle = '';

            if (t.estado.includes('Completo')) {
                statusBadgeClass = 'badge-success';
            } else if (t.estado.includes('Con desviación')) {
                statusBadgeClass = 'badge-warning';
                cardBorderStyle = 'border-left: 4px solid var(--warning);';
            } else if (t.estado.includes('Parcial')) {
                statusBadgeClass = 'badge-warning';
            } else if (t.estado.includes('Revisión')) {
                statusBadgeClass = 'badge-error';
                cardBorderStyle = 'border-left: 4px solid var(--danger);';
            }

            // Si falta dato crítico (ej. sin orden pero con producción, o sin datos del todo)
            if (t.estado === 'Sin datos') {
                statusBadgeClass = 'badge-outline';
            }

            card.style = cardBorderStyle;

            card.innerHTML = `
                <div class="alert-indicator" style="display: ${t.tieneAlertas ? 'block' : 'none'}"></div>
                <div class="telar-header">
                    <span class="telar-id">${t.codigo}</span>
                    <span class="badge ${statusBadgeClass}">${t.estado}</span>
                </div>
                <div class="telar-info">
                    <div style="margin-bottom: 4px;"><strong>Orden:</strong> ${t.ordenActiva}</div>
                    <div><strong>Producción:</strong> ${t.produccionTotal} m</div>
                </div>
                <div class="telar-metrics">
                    <div class="metric-item">
                        <span class="metric-value">${t.promedioAncho}"</span>
                        <span class="metric-label">Ancho Prom.</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${t.cumplimiento}%</span>
                        <span class="metric-label">Cumple</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `telares_detalle.html?id=${bitacoraId}&maquina=${t.id}&codigo=${t.codigo}`;
            });

            container.appendChild(card);
        });
    }

    // Actualizar reloj
    function updateClock() {
        const now = new Date();
        const reloj = document.getElementById('reloj-operativo');
        if (reloj) reloj.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateClock, 10000);
    updateClock();

    loadResumen();
});
