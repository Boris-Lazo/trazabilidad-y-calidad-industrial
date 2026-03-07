(function () {
    const sidebarElement = document.getElementById('sidebar');
    if (!sidebarElement) return;

    // Obtener información del usuario logueado
    const user = typeof Auth !== 'undefined' && Auth.getUser() ? Auth.getUser() : null;
    const userName = user ? (user.nombre || user.username || 'Usuario') : 'No autenticado';

    // Construir el HTML del sidebar
    const sidebarHTML = `
        <div class="sidebar-header">PROD-SYS</div>
        <nav class="sidebar-nav">
            <a href="/" class="nav-item nav-item-single" data-path="/">
                <i data-lucide="layout-dashboard" class="nav-icon"></i>
                <span>Dashboard</span>
            </a>
            <div class="nav-group">
                <button class="nav-group-toggle">
                    <i data-lucide="clipboard-list" class="nav-icon"></i>
                    <span>Producción</span>
                    <i data-lucide="chevron-right" class="chevron"></i>
                </button>
                <div class="nav-group-items">
                    <a href="/planificacion.html" class="nav-item" data-path="/planificacion.html">Planificación Semanal</a>
                    <a href="/bitacora.html" class="nav-item" data-path="/bitacora.html">Bitácora de Turno</a>
                    <a href="/ordenes.html" class="nav-item" data-path="/ordenes.html">Órdenes</a>
                    <a href="/ejecucion.html" class="nav-item" data-path="/ejecucion.html">Ejecución</a>
                    <a href="/incidentes.html" class="nav-item" data-path="/incidentes.html">Incidentes</a>
                </div>
            </div>
            <div class="nav-group">
                <button class="nav-group-toggle">
                    <i data-lucide="shield-check" class="nav-icon"></i>
                    <span>Control</span>
                    <i data-lucide="chevron-right" class="chevron"></i>
                </button>
                <div class="nav-group-items">
                    <a href="/calidad.html" class="nav-item" data-path="/calidad.html">Calidad</a>
                    <a href="/trazabilidad.html" class="nav-item" data-path="/trazabilidad.html">Trazabilidad</a>
                </div>
            </div>
            <div class="nav-group" id="nav-group-admin">
                <button class="nav-group-toggle">
                    <i data-lucide="settings" class="nav-icon"></i>
                    <span>Administración</span>
                    <i data-lucide="chevron-right" class="chevron"></i>
                </button>
                <div class="nav-group-items">
                    <div class="nav-section-label">Colaboradores</div>
                    <a href="/personal.html" class="nav-item" data-path="/personal.html">Lista</a>
                    <a href="/grupos.html" class="nav-item" data-path="/grupos.html">Grupos</a>
                    <div class="nav-section-label">Sistema</div>
                    <a href="/maquinas.html" class="nav-item" data-path="/maquinas.html">Máquinas</a>
                    <a href="/auditoria.html" class="nav-item" data-path="/auditoria.html">Auditoría</a>
                    <a href="/procesos.html" class="nav-item" data-path="/procesos.html">Procesos</a>
                </div>
            </div>
        </nav>
        <div style="padding: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
            <div id="user-display" style="margin-bottom: 12px; font-size: 13px; color: rgba(255,255,255,0.7);">
                <i data-lucide="user" style="width:14px; height:14px; vertical-align:middle; margin-right:8px;"></i>
                <span id="user-name-label">Usuario: ${userName}</span>
            </div>
            <a href="/login.html" id="logout-link" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; background: rgba(255,255,255,0.1); border: none; color: white;">
                <i data-lucide="log-out" class="nav-icon"></i>
                <span>Cerrar Sesión</span>
            </a>
        </div>
    `;

    // Inyectar el HTML
    sidebarElement.innerHTML = sidebarHTML;

    // Detectar página actual y marcar "active" y "open"
    const currentPath = window.location.pathname;
    
    // Primero, limpiar posibles active
    document.querySelectorAll('#sidebar .nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#sidebar .nav-group').forEach(el => el.classList.remove('open'));

    // Buscar el link que coincide
    let activeLink = document.querySelector(`#sidebar .nav-item[href="${currentPath}"]`);
    
    // Fallback: Si no lo encuentra exacto (ej. con query params o variaciones base), podemos buscar por data-path
    if (!activeLink) {
        const potentialLinks = document.querySelectorAll('#sidebar .nav-item[data-path]');
        for (const link of potentialLinks) {
            if (currentPath === link.getAttribute('data-path') || (currentPath === '/' && link.getAttribute('data-path') === '/')) {
                activeLink = link;
                break;
            }
        }
    }
    
    // Si sigue sin encontrar para la ruta actual (y estamos en un index pero no en localhost/), asumir dashboard
    if (!activeLink && currentPath.endsWith('index.html')) {
        activeLink = document.querySelector('#sidebar .nav-item[href="/"]');
    }

    if (activeLink) {
        activeLink.classList.add('active');
        
        // Si está dentro de un grupo, abrir el grupo padre
        const parentGroup = activeLink.closest('.nav-group');
        if (parentGroup) {
            parentGroup.classList.add('open');
            const groupItems = parentGroup.querySelector('.nav-group-items');
            if(groupItems) {
                groupItems.style.display = 'block';
            }
        }
    }

    // Inicializar íconos Lucide.js para los creados dinámicamente
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }

    // Enlazar los eventos de toggle del sidebar.
    // Si DesignSystem ya está disponible (defer puede que aún no haya corrido),
    // lo usamos; si no, enlazamos los listeners nosotros directamente.
    const bindToggles = function () {
        const groups = document.querySelectorAll('#sidebar .nav-group');
        document.querySelectorAll('#sidebar .nav-group-toggle').forEach(function (toggle) {
            toggle.addEventListener('click', function () {
                const group = toggle.closest('.nav-group');
                const isOpen = group.classList.contains('open');
                // Cerrar todos los demás
                groups.forEach(function (g) {
                    if (g !== group) g.classList.remove('open');
                });
                // Alternar el actual
                group.classList.toggle('open', !isOpen);
            });
        });
    };

    if (window.DesignSystem && typeof window.DesignSystem.initSidebar === 'function') {
        window.DesignSystem.initSidebar();
    } else {
        // design-system/index.js es defer y puede no haber corrido aún;
        // enlazamos los listeners aquí de forma independiente.
        bindToggles();
        // También los re-enlazamos cuando DesignSystem finalmente cargue
        document.addEventListener('DOMContentLoaded', function () {
            if (window.DesignSystem && typeof window.DesignSystem.initSidebar === 'function') {
                window.DesignSystem.initSidebar();
            }
        });
    }
}());
