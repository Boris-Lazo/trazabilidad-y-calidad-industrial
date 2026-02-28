
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

    // 2. Guardia Operativa Global: "NADA ocurre fuera de la Bitácora"
    // Bloquea accesos directos a pantallas de registro si no hay bitácora abierta.
    const path = window.location.pathname;
    const operativePages = ['/proceso.html', '/ejecucion.html', '/incidentes.html', '/calidad.html', '/trazabilidad.html'];

    if (operativePages.some(p => path.includes(p))) {
        try {
            const res = await fetch('/api/bitacora/estado');
            const result = await res.json();

            if (result.success && !result.data.abierta) {
                // Redirigir a la bitácora con un mensaje claro
                console.warn("Acceso denegado: No existe una bitácora activa para este turno.");
                alert("ATENCIÓN: Debe abrir una Bitácora de Turno antes de acceder a esta sección operativa.");
                window.location.href = '/bitacora.html';
            }
        } catch (e) {
            console.error("Error en guardia operativa:", e);
        }
    }
});
