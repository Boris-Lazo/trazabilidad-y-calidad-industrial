
const AUTH_TOKEN_KEY = 'prod_sys_token';
const AUTH_USER_KEY = 'prod_sys_user';

// Función auxiliar para decodificar el payload de un JWT de forma segura
function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error al decodificar el token JWT:", e);
        return null;
    }
}

const Auth = {
    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    getUser() {
        const user = localStorage.getItem(AUTH_USER_KEY);
        try {
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    },

    saveSession(token, user) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    },

    clearSession() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    },

    async logout() {
        this.clearSession();
        try {
            // Intenta notificar al servidor, pero no esperes la respuesta para redirigir
            fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {}
        window.location.href = '/login.html';
    },

    isAuthenticated() {
        const token = this.getToken();
        if (!token) {
            return false;
        }

        const payload = decodeJwtPayload(token);

        // Si el token está malformado o no tiene fecha de expiración
        if (!payload || !payload.exp) {
            this.clearSession();
            return false;
        }

        // Comprueba si el token ha expirado (exp está en segundos, Date.now() en ms)
        if (Date.now() >= payload.exp * 1000) {
            this.clearSession(); // Limpia el token expirado
            return false;
        }

        return true;
    },

    checkAuth() {
        const isAuth = this.isAuthenticated();
        const path = window.location.pathname;
        
        // Si no está autenticado y no está en la página de login, redirigir
        if (!isAuth && path !== '/login.html' && !path.endsWith('/login.html')) {
            window.location.href = '/login.html';
        }
    }
};

// Comprobar la autenticación tan pronto como el script se carga
Auth.checkAuth();

// Interceptor de Fetch para añadir el token y manejar errores de autenticación (401)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    let [resource, config] = args;
    
    // Adjuntar el token solo si la sesión es válida
    if (Auth.isAuthenticated()) {
        const token = Auth.getToken();
        config = config || {};
        config.headers = config.headers || {};
        if (!config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await originalFetch(resource, config);

        // Si la API devuelve 401, la sesión es inválida en el servidor -> logout
        const isLoginPage = window.location.pathname.includes('login.html');
        if (response.status === 401 && !isLoginPage) {
            Auth.logout();
        }

        return response;
    } catch (error) {
        console.error("Error en el interceptor de fetch:", error);
        throw error;
    }
};


document.addEventListener('DOMContentLoaded', () => {
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        if(Auth.isAuthenticated()) {
            const user = Auth.getUser();
            if (user) {
                userDisplay.textContent = `Usuario: ${user.nombre || user.username}`;
            }
        } else {
            userDisplay.textContent = 'Usuario: -';
        }
    }
});

// Exponer Auth al objeto window para acceso global
window.Auth = Auth;
