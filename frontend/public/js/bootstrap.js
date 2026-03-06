document.addEventListener('DOMContentLoaded', async () => {
    const bootstrapForm = document.getElementById('bootstrap-form');
    const errorDiv = document.getElementById('bootstrap-error');
    const btnInit = document.getElementById('btn-init');

    // Verificar si el sistema ya fue inicializado
    try {
        const response = await fetch('/api/bootstrap/data');
        if (response.status === 403 || !response.ok) {
            window.location.href = '/login.html';
            return;
        }
    } catch (error) {
        console.error('Error checking bootstrap status:', error);
    }

    // Manejar envío del formulario
    if (bootstrapForm) {
        bootstrapForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            errorDiv.style.display = 'none';
            if (window.DesignSystem) DesignSystem.setBtnLoading(btnInit, true);
            else btnInit.disabled = true;

            const formData = new FormData(bootstrapForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/bootstrap/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    DesignSystem.showToast('Sistema inicializado con éxito.', 'success');
                    window.location.href = '/login.html';
                } else {
                    errorDiv.textContent = result.error || 'Error al inicializar el sistema';
                    errorDiv.style.display = 'block';
                    if (window.DesignSystem) DesignSystem.setBtnLoading(btnInit, false);
                    else btnInit.disabled = false;
                }
            } catch (error) {
                console.error('Bootstrap error:', error);
                errorDiv.textContent = 'Error de conexión con el servidor';
                errorDiv.style.display = 'block';
                if (window.DesignSystem) DesignSystem.setBtnLoading(btnInit, false);
                else btnInit.disabled = false;
            }
        });
    }
});