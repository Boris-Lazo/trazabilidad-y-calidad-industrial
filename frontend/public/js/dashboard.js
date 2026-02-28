
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

        elements.dashEstadoBitacora.textContent = state.abierta ? state.bitacora.estado : 'SIN BITÁCORA';
        elements.dashEstadoBitacora.className = `badge badge-${state.abierta ? 'success' : 'outline'}`;

        blockingDiv.style.display = (state.razonesBloqueo && state.razonesBloqueo.length > 0) ? 'block' : 'none';
        reasonsList.innerHTML = (state.razonesBloqueo || []).map(r => `<li>${r}</li>`).join('');

        btn.style.display = 'inline-block';
        btn.onclick = () => handleAction(state.siguienteAccion, state);

        switch (state.estadoOperativo) {
            case 'SIN_TURNO':
                title.textContent = 'Bienvenido al Turno';
                desc.textContent = 'No hay una bitácora abierta. Inicie el turno para comenzar el registro operativo.';
                btn.textContent = 'ABRIR BITÁCORA DE TURNO';
                iconContainer.innerHTML = '<i data-lucide="play-circle" style="width: 64px; height: 64px; color: var(--primary-color);"></i>';
                break;
            case 'EN_CURSO':
                title.textContent = 'Turno en Curso';
                desc.textContent = 'Existen procesos pendientes de registro en este turno.';
                btn.textContent = 'IR A PROCESOS PENDIENTES';
                iconContainer.innerHTML = '<i data-lucide="activity" style="width: 64px; height: 64px; color: var(--warning);"></i>';
                break;
            case 'LISTO_PARA_CIERRE':
                title.textContent = 'Procesos Completados';
                desc.textContent = 'Todos los procesos han sido registrados. Puede proceder al cierre del turno.';
                btn.textContent = 'REALIZAR CIERRE DE TURNO';
                btn.className = 'btn btn-primary';
                iconContainer.innerHTML = '<i data-lucide="check-circle" style="width: 64px; height: 64px; color: var(--success);"></i>';
                break;
            case 'CERRADO':
                title.textContent = 'Turno Finalizado';
                desc.textContent = 'Esta bitácora ha sido cerrada. El sistema se encuentra en modo de solo lectura.';
                btn.style.display = 'none';
                iconContainer.innerHTML = '<i data-lucide="lock" style="width: 64px; height: 64px; color: var(--text-secondary);"></i>';
                break;
            default:
                title.textContent = 'Estado Desconocido';
                desc.textContent = 'Contacte a soporte técnico.';
                btn.style.display = 'none';
        }

        if (window.lucide) window.lucide.createIcons();
    }

    function handleAction(action, state) {
        if (action === 'ABRIR_TURNO' || action === 'CERRAR_TURNO' || action === 'COMPLETAR_PROCESOS') {
            window.location.href = '/bitacora.html';
        } else if (action.startsWith('IR_A_')) {
            window.location.href = '/bitacora.html';
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
