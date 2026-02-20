
const AUTH_TOKEN_KEY = 'prod_sys_token';
const AUTH_USER_KEY = 'prod_sys_user';

const Auth = {
    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    getUser() {
        const user = localStorage.getItem(AUTH_USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    saveSession(token, user) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    },

    async logout() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {}
        window.location.href = '/login.html';
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    checkAuth() {
        const path = window.location.pathname;
        if (!this.isAuthenticated() && path !== '/login.html') {
            window.location.href = '/login.html';
        }
    }
};

// Check auth immediately
Auth.checkAuth();

// Interceptar fetch para añadir el token y manejar 401
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    let [resource, config] = args;
    const token = Auth.getToken();

    if (token) {
        config = config || {};
        config.headers = config.headers || {};
        // Si ya tiene Authorization no lo sobreescribimos (por si acaso)
        if (!config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await originalFetch(resource, config);

        if (response.status === 401 && window.location.pathname !== '/login.html') {
            Auth.logout();
        }

        return response;
    } catch (error) {
        throw error;
    }
};

// At el final de public/js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        const user = Auth.getUser();
        if (user) {
            userDisplay.textContent = `Usuario: ${user.nombre || user.username}`;
        }
    }
});

// Exponer Auth globalmente
window.Auth = Auth;
