
document.addEventListener('DOMContentLoaded', () => {
    const selectionScreen = document.getElementById('selection-screen');
    const wizardScreen = document.getElementById('wizard-screen');
    const successScreen = document.getElementById('success-screen');
    const lineaSelect = document.getElementById('linea-select');
    const startBtn = document.getElementById('start-work');

    const wizardForm = document.getElementById('wizard-form');
    const steps = document.querySelectorAll('.step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const nextBtn = document.getElementById('next-step');
    const prevBtn = document.getElementById('prev-step');
    const submitBtn = document.getElementById('submit-work');

    let currentStep = 1;
    let selectedLineaId = null;

    // Cargar líneas activas
    async function cargarLineas() {
        try {
            const response = await fetch('/api/lineas-ejecucion');
            const lineas = await response.json();
            lineaSelect.innerHTML = '<option value="">Seleccione una línea...</option>';
            lineas.forEach(l => {
                lineaSelect.innerHTML += `<option value="${l.id}">Línea #${l.id} - Orden #${l.orden_produccion_id}</option>`;
            });

            // Si viene ID por URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('lineaId')) {
                lineaSelect.value = urlParams.get('lineaId');
            }
        } catch (e) { console.error(e); }
    }

    startBtn.addEventListener('click', () => {
        selectedLineaId = lineaSelect.value;
        if (!selectedLineaId) return alert('Seleccione una línea');
        selectionScreen.style.display = 'none';
        wizardScreen.style.display = 'block';
    });

    function updateWizard() {
        steps.forEach(s => s.classList.remove('active'));
        progressSteps.forEach(s => s.classList.remove('active'));

        document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
        for(let i=0; i<currentStep; i++) progressSteps[i].classList.add('active');

        prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

        if (currentStep === steps.length) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-flex';
            renderSummary();
        } else {
            nextBtn.style.display = 'inline-flex';
            submitBtn.style.display = 'none';
        }
    }

    function renderSummary() {
        const formData = new FormData(wizardForm);
        const data = Object.fromEntries(formData.entries());
        const summary = document.getElementById('summary-review');
        summary.innerHTML = `
            <div style="margin-bottom: 0.5rem;"><strong>Línea:</strong> #${selectedLineaId}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Producción:</strong> ${data.cantidad_producida}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Merma:</strong> ${data.merma_kg || 0} kg</div>
            <div><strong>Parámetros:</strong> Temp: ${data.param_temp}°C, Presión: ${data.param_presion} bar</div>
        `;
    }

    nextBtn.addEventListener('click', () => {
        if (currentStep < steps.length) {
            currentStep++;
            updateWizard();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateWizard();
        }
    });

    wizardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(wizardForm);
        const rawData = Object.fromEntries(formData.entries());

        const payload = {
            linea_ejecucion_id: parseInt(selectedLineaId),
            cantidad_producida: parseFloat(rawData.cantidad_producida),
            merma_kg: parseFloat(rawData.merma_kg || 0),
            parametros: JSON.stringify({
                temperatura: rawData.param_temp,
                presion: rawData.param_presion
            }),
            observaciones: rawData.obs_inicio,
            fecha_hora: new Date().toISOString(),
            estado: 'completado'
        };

        try {
            const response = await fetch('/api/registros-trabajo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                wizardScreen.style.display = 'none';
                successScreen.style.display = 'block';
            }
        } catch (err) { console.error(err); }
    });

    cargarLineas();
});
