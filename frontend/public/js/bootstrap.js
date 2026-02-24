document.addEventListener('DOMContentLoaded', async () => {
    const bootstrapForm = document.getElementById('bootstrap-form');
    const areaSelect = document.getElementById('area_id');
    const errorDiv = document.getElementById('bootstrap-error');
    const btnInit = document.getElementById('btn-init');

    // 1. Cargar datos de inicialización (áreas)
    try {
        const response = await fetch('/api/bootstrap/data');
        const result = await response.json();

        if (result.success && result.data.areas) {
            areaSelect.innerHTML = '<option value="">Seleccione un área</option>';
            result.data.areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id;
                option.textContent = area.nombre;
                areaSelect.appendChild(option);
            });
        } else {
            // Si ya está inicializado, el backend arrojará error aquí
            if (response.status === 403 || !result.success) {
                window.location.href = '/login.html';
            }
        }
    } catch (error) {
        console.error('Error loading bootstrap data:', error);
    }

    // 2. Manejar envío del formulario
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
                    // Éxito: El sistema está inicializado
                    alert('Sistema inicializado con éxito. Ahora puede iniciar sesión con sus nuevas credenciales.');
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
