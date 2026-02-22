document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            const btnLogin = document.getElementById('btn-login');

            errorDiv.style.display = 'none';
            btnLogin.disabled = true;
            btnLogin.textContent = 'Iniciando sesión...';

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Guardar la sesión y redirigir al dashboard
                    Auth.saveSession(data.token, data.user);
                    window.location.href = '/';
                } else {
                    errorDiv.textContent = data.message || 'Error al iniciar sesión';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                console.error('Login error:', error);
                errorDiv.textContent = 'Error de conexión con el servidor';
                errorDiv.style.display = 'block';
            } finally {
                btnLogin.disabled = false;
                btnLogin.textContent = 'Iniciar sesión';
            }
        });
    }
});
