// Main JS - Industrial Design System Compatibility
document.addEventListener('DOMContentLoaded', () => {
    // Lucide icons are already initialized by design-system/index.js
    // This file is kept for backward compatibility with existing HTML references.
    console.log("Main Layout initialized");

    // Lógica de visibilidad del módulo de Administración
    const adminGroup = document.getElementById('nav-group-admin');
    if (adminGroup && window.Auth) {
        const user = Auth.getUser();
        if (user) {
            const authorizedRoles = ['Administrador', 'Jefe de Operaciones', 'Inspector', 'Inspector de Calidad'];
            if (!authorizedRoles.includes(user.rol)) {
                adminGroup.remove(); // Eliminar del DOM para seguridad visual (no reemplaza seguridad de API)
            }
        }
    }
});
