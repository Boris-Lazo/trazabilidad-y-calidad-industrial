
document.addEventListener('DOMContentLoaded', () => {
    const viewApertura = document.getElementById('view-apertura');
    const viewAbierta = document.getElementById('view-abierta');
    const formAbrir = document.getElementById('form-abrir-bitacora');
    const gridProcesos = document.getElementById('grid-procesos');
    const btnCerrar = document.getElementById('btn-cerrar-bitacora');
    const modalCierre = document.getElementById('modal-cierre');
    const checklistProcesos = document.getElementById('checklist-procesos');
    const containerRevision = document.getElementById('container-revision');
    const obsRevision = document.getElementById('obs-revision');
    const confirmarCierre = document.getElementById('confirmar-cierre');
    const cancelarCierre = document.getElementById('cancelar-cierre');

    let currentBitacora = null;
    let procesosTurno = [];

    // --- RELOJ Y TIEMPO REAL ---
    async function updateClock() {
        try {
            const response = await fetch('/api/bitacora/tiempo-actual');
            const result = await response.json();
            const data = result.data || {};

            document.getElementById('reloj-fecha').textContent = data.fecha;
            document.getElementById('reloj-hora').textContent = data.hora;
        } catch (error) {
            console.error('Error al actualizar el reloj:', error);
        }
    }

    setInterval(updateClock, 60000);
    updateClock();

    // --- ESTADO Y CARGA ---
    async function checkEstado() {
        try {
            const response = await fetch('/api/bitacora/estado');
            const result = await response.json();
            const data = result.data || {};

            if (data.abierta) {
                currentBitacora = data.bitacora;
                procesosTurno = data.procesos;
                showAbierta(data);
            } else {
                showApertura();
            }
        } catch (error) {
            console.error('Error al consultar estado:', error);
        }
    }

    async function showApertura() {
        viewApertura.style.display = 'block';
        viewAbierta.style.display = 'none';
        document.getElementById('header-contexto').style.display = 'none';

        const user = Auth.getUser();
        if (user) {
            document.getElementById('inspector').value = user.nombre || user.username;
        }
    }

    function showAbierta(data) {
        viewApertura.style.display = 'none';
        viewAbierta.style.display = 'block';
        document.getElementById('header-contexto').style.display = 'flex';

        const b = data.bitacora;
        document.getElementById('info-turno').textContent = b.turno;
        document.getElementById('info-fecha').textContent = b.fecha_operativa;
        document.getElementById('info-inspector').textContent = b.inspector;
        document.getElementById('info-estado').textContent = b.estado;

        if (b.fuera_de_horario) {
            document.getElementById('warning-horario').style.display = 'block';
        }

        gridProcesos.innerHTML = '';
        data.procesos.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card process-card';
            card.style.borderLeft = `8px solid ${getEstadoColor(p.estado)}`;
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';

            card.innerHTML = `
                <div style="padding: 1rem;">
                    <h3 style="margin-bottom: 0.5rem; font-size: 1.1rem;">${p.nombre}</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="badge ${getBadgeClass(p.estado)}">${p.estado}</span>
                        <small style="color: var(--text-secondary);">${p.ultimaActualizacion}</small>
                    </div>
                </div>
                <div style="background: rgba(0,0,0,0.05); padding: 0.75rem 1rem; text-align: right;">
                    <button class="btn ${p.accion === 'Registrar' ? 'btn-primary' : 'btn-secondary'} btn-registrar"
                            data-id="${p.id}" data-nombre="${p.nombre}" style="min-width: 120px;">
                        ${p.accion}
                    </button>
                </div>
            `;
            gridProcesos.appendChild(card);
        });

        // Lógica de habilitación de cierre: Guía y Bloquea
        const todosListos = data.procesos.every(p =>
            p.estado.includes('Completo') || p.estado.includes('Revisión')
        );
        btnCerrar.disabled = !todosListos;
        btnCerrar.title = todosListos ? 'Finalizar Turno' : 'Complete todos los procesos antes de cerrar';

        // Listeners a botones de tarjetas
        document.querySelectorAll('.btn-registrar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const nombre = e.target.getAttribute('data-nombre');
                if (nombre === 'Telares') {
                    window.location.href = `/telares_resumen.html?id=${currentBitacora.id}`;
                } else {
                    window.location.href = `/proceso.html?id=${id}&nombre=${encodeURIComponent(nombre)}`;
                }
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function getEstadoColor(estado) {
        if (estado.includes('Sin datos')) return 'var(--text-secondary)';
        if (estado.includes('Parcial')) return 'var(--warning)';
        if (estado.includes('Completo')) return 'var(--success)';
        if (estado.includes('Revisión')) return 'var(--danger)';
        return 'var(--border-color)';
    }

    function getBadgeClass(estado) {
        if (estado.includes('Sin datos')) return 'badge-outline';
        if (estado.includes('Parcial')) return 'badge-warning';
        if (estado.includes('Completo')) return 'badge-success';
        if (estado.includes('Revisión')) return 'badge-error';
        return '';
    }

    // --- APERTURA ---
    formAbrir.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/bitacora/abrir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ })
            });

            if (response.ok) {
                checkEstado();
            } else {
                const result = await response.json();
                alert(result.error || 'Error al abrir bitácora');
            }
        } catch (error) {
            console.error('Error al abrir:', error);
        }
    });

    // --- CIERRE (INTEGRITY CHECKLIST) ---
    btnCerrar.addEventListener('click', () => {
        if (btnCerrar.disabled) return;

        checklistProcesos.innerHTML = '';
        let hasRevision = false;

        procesosTurno.forEach(p => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.padding = '0.5rem';
            item.style.borderBottom = '1px solid var(--border-color)';

            const labelColor = p.estado.includes('Completo') ? 'var(--success)' : 'var(--danger)';
            const icon = p.estado.includes('Completo') ? 'check-circle' : 'alert-circle';

            if (p.estado.includes('Revisión')) hasRevision = true;

            item.innerHTML = `
                <span><i data-lucide="${icon}" style="width: 14px; height: 14px; vertical-align: middle; color: ${labelColor}; margin-right: 8px;"></i> ${p.nombre}</span>
                <span style="font-weight: bold; color: ${labelColor}">${p.estado}</span>
            `;
            checklistProcesos.appendChild(item);
        });

        containerRevision.style.display = hasRevision ? 'block' : 'none';
        obsRevision.required = hasRevision;

        modalCierre.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    });

    confirmarCierre.addEventListener('click', async () => {
        if (containerRevision.style.display === 'block' && !obsRevision.value.trim()) {
            alert('Por favor, ingrese el motivo de revisión de los procesos marcados.');
            obsRevision.focus();
            return;
        }

        try {
            const response = await fetch(`/api/bitacora/${currentBitacora.id}/cerrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observaciones: obsRevision.value })
            });

            if (response.ok) {
                modalCierre.style.display = 'none';
                obsRevision.value = '';
                checkEstado();
            } else {
                const res = await response.json();
                alert('Error al cerrar: ' + (res.error || res.message));
            }
        } catch (error) {
            console.error('Error al cerrar:', error);
        }
    });

    cancelarCierre.onclick = () => { modalCierre.style.display = 'none'; };

    checkEstado();
});
