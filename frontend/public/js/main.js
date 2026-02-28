
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Sistema Industrial Inicializado");

    // 1. Lógica de visibilidad RBAC (Administración)
    const adminGroup = document.getElementById('nav-group-admin');
    if (adminGroup && window.Auth) {
        const user = Auth.getUser();
        if (user) {
            const authorizedRoles = ['Administrador', 'Jefe de Operaciones', 'Inspector', 'Inspector de Calidad'];
            if (!authorizedRoles.includes(user.rol)) {
                adminGroup.remove();
            }
        }
    }

    // 2. Guardia Operativa Global: Estado Explícito
    const path = window.location.pathname;
    const operativePages = ['/proceso.html', '/ejecucion.html', '/incidentes.html', '/calidad.html', '/trazabilidad.html', '/ordenes.html'];

    try {
        const res = await fetch('/api/bitacora/estado');
        const result = await res.json();
        const state = result.data || {};

        if (!state.estadoOperativo) {
            console.error("Estado operativo incompleto. Contacte soporte.");
            if (operativePages.some(p => path.includes(p))) {
                document.body.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; font-family:sans-serif;"><h1>⚠️ ERROR DE SISTEMA</h1><p>Estado operativo incompleto. Contacte soporte.</p></div>';
            }
            return;
        }

        // Bloqueo de navegación lateral si no hay turno o está cerrado
        const navProduccion = document.querySelector('.nav-group');
        const navControl = document.querySelectorAll('.nav-group')[1];

        if (state.bloqueos && (state.bloqueos.includes('TODO') || state.bloqueos.includes('PRODUCCION'))) {
            if (navProduccion) {
                navProduccion.querySelectorAll('a').forEach(a => {
                    if (!a.href.includes('bitacora.html')) {
                        a.style.pointerEvents = 'none';
                        a.style.opacity = '0.5';
                    }
                });
            }
        }

        if (state.bloqueos && (state.bloqueos.includes('TODO') || state.bloqueos.includes('CALIDAD'))) {
            if (navControl) {
                navControl.style.pointerEvents = 'none';
                navControl.style.opacity = '0.5';
            }
        }

        // Redirección forzada desde el dashboard si hay procesos pendientes
        if (path === '/' || path === '/index.html') {
            if (state.siguienteAccion === 'IR_A_PROCESO' && state.actionPayload) {
                const p = state.actionPayload;
                window.location.href = `/proceso.html?id=${p.proceso_id}&nombre=${encodeURIComponent(p.proceso_nombre)}`;
            }
        }

        if (operativePages.some(p => path.includes(p)) && !state.abierta) {
             window.location.href = '/bitacora.html';
        }

        // Exportar estado para uso en otras pantallas
        window.AppState = state;

    } catch (e) {
        console.error("Error en guardia operativa:", e);
    }
});
