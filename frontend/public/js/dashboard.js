
window.dashboardIntervalId = null;

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        countOrdenes: document.getElementById('count-ordenes-activas'),
        countIncidentes: document.getElementById('count-incidentes-activos'),
        countProduccionTurno: document.getElementById('count-produccion-turno'),
        alertCountTotal: document.getElementById('alert-count-total'),
        tablaOrdenesBody: document.querySelector('#tabla-ordenes-activas tbody'),
        listaIncidentes: document.getElementById('lista-incidentes-criticos'),
        lastUpdatedSpan: document.getElementById('last-updated'),

        // Contexto Operativo
        dashTurno: document.getElementById('dash-turno'),
        dashFecha: document.getElementById('dash-fecha'),
        dashEstadoBitacora: document.getElementById('dash-estado-bitacora'),
        dashHora: document.getElementById('dash-hora'),
        dashWarningBitacora: document.getElementById('dash-warning-bitacora')
    };

    async function cargarContexto() {
        try {
            const resContexto = await fetch('/api/bitacora/tiempo-actual');
            const dataContexto = (await resContexto.json()).data || {};

            elements.dashTurno.textContent = dataContexto.turno;
            elements.dashFecha.textContent = dataContexto.fechaOperativa || dataContexto.fecha;
            elements.dashHora.textContent = dataContexto.hora;

            const resEstado = await fetch('/api/bitacora/estado');
            const state = (await resEstado.json()).data || {};

            if (!state.estadoTurno) {
                document.body.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; font-family:sans-serif;"><h1>⚠️ ERROR DE SISTEMA</h1><p>Estado operativo incompleto. Contacte soporte.</p></div>';
                return;
            }

            // Renderizar el centro de acción con todos los procesos
            renderActionCenter(state);
        } catch (e) {
            console.error("Error al cargar contexto:", e);
        }
    }

    function renderActionCenter(state) {
        const title = document.getElementById('action-title');
        const desc = document.getElementById('action-description');
        const btn = document.getElementById('main-action-btn');
        const iconContainer = document.getElementById('action-icon-container');
        const blockingDiv = document.getElementById('blocking-reasons');
        const reasonsList = document.getElementById('reasons-list');
        const processContainer = document.getElementById('parallel-processes-container');

        elements.dashEstadoBitacora.textContent = state.abierta ? state.bitacora.estado : 'SIN BITÁCORA';
        elements.dashEstadoBitacora.className = `badge badge-${state.abierta ? 'success' : 'outline'}`;

        const blockingReasons = state.bloqueos || [];
        blockingDiv.style.display = blockingReasons.length > 0 ? 'block' : 'none';
        reasonsList.innerHTML = blockingReasons.map(r => `<li>${r}</li>`).join('');

        // Limpiar contenedor de procesos
        if (processContainer) processContainer.innerHTML = '';

        if (state.estadoTurno === 'SIN_TURNO') {
            title.textContent = 'Bienvenido al Turno';
            desc.textContent = 'No hay una bitácora abierta. Inicie el turno para comenzar el registro operativo.';
            btn.textContent = 'ABRIR BITÁCORA DE TURNO';
            btn.style.display = 'inline-block';
            btn.onclick = () => window.location.href = '/bitacora.html';
            iconContainer.innerHTML = '<i data-lucide="play-circle" style="width: 64px; height: 64px; color: var(--primary-color);"></i>';
        } else if (state.estadoTurno === 'CERRADO') {
            title.textContent = 'Turno Finalizado';
            desc.textContent = 'Esta bitácora ha sido cerrada. El sistema se encuentra en modo de solo lectura.';
            btn.style.display = 'none';
            iconContainer.innerHTML = '<i data-lucide="lock" style="width: 64px; height: 64px; color: var(--text-secondary);"></i>';
        } else {
            // TURNO ABIERTO: Mostrar Procesos en Paralelo
            title.textContent = 'Panel de Control de Turno';
            desc.textContent = 'Gestione cada proceso de forma independiente.';
            btn.style.display = state.estadoTurno === 'LISTO_PARA_CIERRE' ? 'inline-block' : 'none';
            btn.textContent = 'REALIZAR CIERRE DE TURNO';
            btn.onclick = () => window.location.href = '/bitacora.html';
            iconContainer.innerHTML = `<i data-lucide="${state.estadoTurno === 'LISTO_PARA_CIERRE' ? 'check-circle' : 'activity'}" style="width: 64px; height: 64px; color: var(--primary-color);"></i>`;

            if (processContainer && state.procesos) {
                renderParallelProcesses(state.procesos, processContainer);
            }
        }

        if (window.lucide) window.lucide.createIcons();
    }

    function renderParallelProcesses(procesos, container) {
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8';
        container.innerHTML = procesos.map(p => {
            const statusClass = p.estadoProceso === 'EN_PARO' ? 'badge-danger' :
                               p.estadoProceso === 'COMPLETO' ? 'badge-success' : 'badge-warning';

            return `
                <div class="card p-4 flex flex-col justify-between border-l-4" style="border-left-color: ${statusClass === 'badge-success' ? 'var(--success)' : statusClass === 'badge-danger' ? 'var(--danger)' : 'var(--warning)'}">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-lg">${p.nombre}</h3>
                            <span class="badge ${statusClass}">${p.estadoUI}</span>
                        </div>
                        <p class="text-sm text-secondary mb-4">Ult. Act: ${p.ultimaActualizacion}</p>
                        ${p.bloqueos.length > 0 ? `<p class="text-xs text-danger mb-2">⚠️ ${p.bloqueos[0]}</p>` : ''}
                    </div>
                    <button class="btn btn-outline w-full mt-4" onclick="window.location.href='/proceso.html?id=${p.id}&nombre=${encodeURIComponent(p.nombre)}'">
                        ${p.estadoProceso === 'EN_PARO' ? 'GESTIONAR ARRANQUE' : 'VER DETALLE / REGISTRAR'}
                    </button>
                </div>
            `;
        }).join('');
    }

    function handleAction(action, state) {
        if (action === 'ABRIR_TURNO' || action === 'CERRAR_TURNO') {
            window.location.href = '/bitacora.html';
        } else if (action === 'IR_A_PROCESO' && state.actionPayload) {
            const p = state.actionPayload;
            window.location.href = `/proceso.html?id=${p.proceso_id}&nombre=${encodeURIComponent(p.proceso_nombre)}`;
        }
    }

    async function cargarResumen() {
        try {
            if (!window.Auth || !window.Auth.isAuthenticated()) return;

            const response = await fetch('/api/dashboard/summary');
            const data = (await response.json()).data || {};

            if (elements.countOrdenes) elements.countOrdenes.textContent = data.ordenesActivas;
            if (elements.countProduccionTurno) elements.countProduccionTurno.textContent = `${data.produccionDia} kg`;

            if (elements.lastUpdatedSpan) {
                const now = new Date();
                elements.lastUpdatedSpan.textContent = `Actualizado: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('Error dashboard summary:', error);
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

    cargarContexto();
    cargarResumen();
    window.dashboardIntervalId = setInterval(() => {
        cargarContexto();
        cargarResumen();
    }, 60000);
});
