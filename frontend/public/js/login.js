document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si el sistema necesita bootstrap
    try {
        const res = await fetch('/api/bootstrap/status');
        const status = await res.json();
        if (status.success && !status.data.initialized) {
            window.location.href = '/bootstrap.html';
            return;
        }
    } catch (e) {
        console.error('Error checking system status:', e);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            const btnLogin = document.getElementById('btn-login');

            errorDiv.style.display = 'none';
            if (window.DesignSystem) DesignSystem.setBtnLoading(btnLogin, true);
            else {
                btnLogin.disabled = true;
                btnLogin.textContent = 'Iniciando sesión...';
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    if (result.data.user.must_change_password) {
                        Auth.saveSession(result.data.token, result.data.user);
                        document.getElementById('current-password').value = password;
                        document.getElementById('modal-change-password').style.display = 'flex';
                    } else {
                        // Guardar la sesión y redirigir al dashboard
                        Auth.saveSession(result.data.token, result.data.user);
                        window.location.href = '/';
                    }
                } else {
                    errorDiv.textContent = result.error || 'Error al iniciar sesión';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                console.error('Login error:', error);
                errorDiv.textContent = 'Error de conexión con el servidor';
                errorDiv.style.display = 'block';
            } finally {
                if (window.DesignSystem) DesignSystem.setBtnLoading(btnLogin, false);
                else {
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'Iniciar sesión';
                }
            }
        });
    }

    const btnSavePassword = document.getElementById('btn-save-password');
    if (btnSavePassword) {
        btnSavePassword.addEventListener('click', async () => {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorDiv = document.getElementById('cp-error');

            if (newPassword !== confirmPassword) {
                errorDiv.textContent = 'Las contraseñas no coinciden';
                errorDiv.style.display = 'block';
                return;
            }

            if (newPassword.length < 8) {
                errorDiv.textContent = 'La contraseña debe tener al menos 8 caracteres';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                const response = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    window.location.href = '/';
                } else {
                    errorDiv.textContent = result.error || 'Error al cambiar contraseña';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'Error de conexión';
                errorDiv.style.display = 'block';
            }
        });
    }
});
