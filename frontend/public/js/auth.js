const AUTH_TOKEN_KEY = 'prod_sys_token';
const AUTH_USER_KEY = 'prod_sys_user';

function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { return null; }
}

const Auth = {
    isLoggingOut: false,
    getToken() { return localStorage.getItem(AUTH_TOKEN_KEY); },
    getUser() {
        const user = localStorage.getItem(AUTH_USER_KEY);
        try { return user ? JSON.parse(user) : null; } catch (e) { return null; }
    },
    saveSession(token, user) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    },
    clearSession() {
        if (window.dashboardIntervalId) {
            clearInterval(window.dashboardIntervalId);
            window.dashboardIntervalId = null;
        }
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    },
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        const payload = decodeJwtPayload(token);
        if (!payload || !payload.exp || Date.now() >= payload.exp * 1000) {
            this.clearSession();
            return false;
        }
        return true;
    },
    checkAuth() {
        const onLoginPage = window.location.pathname.includes('login.html');
        const onBootstrapPage = window.location.pathname.includes('bootstrap.html');

        if (!this.isAuthenticated() && !onLoginPage && !onBootstrapPage) {
            window.location.replace('/login.html');
        }
    }
};

window.Auth = Auth;
Auth.checkAuth();

document.addEventListener('DOMContentLoaded', () => {
    // TÉCNICA FINAL: DELEGACIÓN DE EVENTOS EN EL SIDEBAR
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.addEventListener('click', function(event) {
            // Comprobar si el elemento clickado es el enlace de logout
            if (event.target && event.target.id === 'logout-link') {
                event.preventDefault(); // Prevenir navegación inmediata

                if (Auth.isLoggingOut) return;
                Auth.isLoggingOut = true;

                Auth.clearSession(); // Limpiar sesión (y temporizador)
                window.location.href = event.target.href; // Navegar
            }
        });
    }

    const userDisplay = document.getElementById('user-display');
    if (userDisplay && Auth.isAuthenticated()) {
        const user = Auth.getUser();
        if (user) {
            userDisplay.textContent = `Usuario: ${user.nombre || user.username}`;
        }
    }
});

const originalFetch = window.fetch;
window.fetch = async (...args) => {
    let [resource, config] = args;
    if (Auth.isAuthenticated()) {
        config = config || {};
        config.headers = config.headers || {};
        if (!config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${Auth.getToken()}`;
        }
    }
    const response = await originalFetch(resource, config);
    const onLoginPage = window.location.pathname.includes('login.html');

    // Solo redirigir si el error es realmente un problema de sesión y no un error funcional
    // 401 suele ser token expirado o inválido
    if (response.status === 401 && !onLoginPage && !Auth.isLoggingOut) {
        const data = await response.clone().json().catch(() => ({}));
        // Si el mensaje indica algo distinto a sesión expirada, no forzamos logout inmediato
        // a menos que sea necesario. Pero 401 por definición es falta de auth.
        Auth.isLoggingOut = true;
        Auth.clearSession();
        window.location.href = '/login.html?error=session_expired';
    }

    // 403 puede ser por cuenta desactivada (según auth.middleware.js)
    if (response.status === 403 && !onLoginPage && !Auth.isLoggingOut) {
        const data = await response.clone().json().catch(() => ({}));

        // Si es cuenta desactivada, sí cerramos sesión
        if (data.error && data.error.includes('desactivada')) {
            Auth.isLoggingOut = true;

            // Cerrar modales abiertos
            const modals = document.querySelectorAll('.modal');
            modals.forEach(m => m.style.display = 'none');

            Auth.clearSession();

            // Usar modal si está disponible
            if (window.DesignSystem && window.DesignSystem.showErrorModal) {
                window.DesignSystem.showErrorModal("Acceso Denegado", "Tu acceso ha sido desactivado por un administrador.");
                setTimeout(() => window.location.href = '/login.html?error=account_disabled', 3000);
            } else {
                // Fallback mínimo si DS no cargó
                window.location.href = '/login.html?error=account_disabled';
            }
        }
        // Si es solo falta de permisos, NO cerramos sesión, solo dejamos que el llamador maneje el error
    }

    return response;
};