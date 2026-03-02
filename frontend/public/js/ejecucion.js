
document.addEventListener('DOMContentLoaded', async () => {

    async function init() {
        try {
            // 1. Obtener bitácora activa
            const bitacoraRes = await fetch('/api/bitacora/activa').then(r => r.json());

            if (!bitacoraRes.success || !bitacoraRes.data) {
                document.getElementById('content-ejecucion').innerHTML = `
                    <div class="card" style="text-align: center; padding: 2rem;">
                        <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--warning); margin-bottom: 1rem;"></i>
                        <p class="text-muted">No hay bitácora activa en este momento.</p>
                        <a href="/bitacora.html" class="button button-primary mt-2">Ir a Bitácora</a>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }

            const bitacora = bitacoraRes.data;

            // 2. Mostrar info de bitácora
            document.getElementById('info-turno').textContent = bitacora.turno;
            document.getElementById('info-fecha').textContent = bitacora.fecha_operativa;
            document.getElementById('info-estado').textContent = bitacora.estado;

            // 3. Cargar resumen de telares
            const telaresRes = await fetch(`/api/telares/resumen?bitacora_id=${bitacora.id}`).then(r => r.json());
            const telares = telaresRes.data || [];

            renderTelares(telares, bitacora.id);

        } catch (error) {
            console.error('Error en ejecucion.js:', error);
            document.getElementById('content-ejecucion').innerHTML =
                '<div class="text-error">Error al cargar datos de ejecución.</div>';
        }
    }

    function renderTelares(telares, bitacoraId) {
        const container = document.getElementById('telares-ejecucion');
        container.innerHTML = '';

        telares.forEach(t => {
            const card = document.createElement('div');
            card.className = 'telar-card';

            let badgeClass = 'badge-outline';
            if (t.estado === 'Completo') badgeClass = 'badge-success';
            else if (t.estado === 'Con desviación') badgeClass = 'badge-warning';
            else if (t.estado === 'Parcial') badgeClass = 'badge-warning';

            card.innerHTML = `
                <div class="alert-indicator" style="display: ${t.tieneAlertas ? 'block' : 'none'}"></div>
                <div class="telar-header">
                    <span class="telar-id">${t.codigo}</span>
                    <span class="badge ${badgeClass}">${t.estado}</span>
                </div>
                <div class="telar-info">
                    <div><strong>Orden:</strong> ${t.ordenActiva || '--'}</div>
                    <div><strong>Producción:</strong> ${t.produccionTotal || 0} m</div>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href =
                    `telares_detalle.html?id=${bitacoraId}&maquina=${t.id}&codigo=${t.codigo}`;
            });

            container.appendChild(card);
        });

        if (telares.length === 0) {
            container.innerHTML =
                '<p class="text-muted">No hay datos de telares para esta bitácora.</p>';
        }
    }

    init();
});
