
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

        if (!state.estadoTurno || !state.siguienteAccion) {
            console.error("Estado operativo incompleto. Contacte soporte.");
            const isHome = path === '/' || path === '/index.html';
            if (operativePages.some(p => path.includes(p)) || isHome) {
                document.body.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; font-family:sans-serif; background:#fef2f2; color:#991b1b; text-align:center; padding:2rem;"><h1>⚠️ ESTADO OPERATIVO INCOMPLETO</h1><p style="font-size:1.2rem;">El sistema no pudo determinar su siguiente paso obligatorio.<br>Contacte a soporte técnico de inmediato.</p></div>';
            }
            return;
        }

        // La navegación libre está permitida.


        // Guardia Operativa: No permitir saltarse el flujo
        if (operativePages.some(p => path.includes(p)) && !state.abierta && !path.includes('ejecucion.html')) {
            window.location.href = '/bitacora.html';
        }

        // Exportar estado para uso en otras pantallas
        window.AppState = state;

    } catch (e) {
        console.error("Error en guardia operativa:", e);
    }
});
