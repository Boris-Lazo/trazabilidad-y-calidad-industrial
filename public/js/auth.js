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
        if (!this.isAuthenticated() && !onLoginPage) {
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
    if (response.status === 401 && !onLoginPage && !Auth.isLoggingOut) {
        Auth.isLoggingOut = true;
        Auth.clearSession();
        window.location.href = '/login.html';
    }
    return response;
};