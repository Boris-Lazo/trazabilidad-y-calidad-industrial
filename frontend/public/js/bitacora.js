
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
            card.className = `card process-card d-flex flex-column justify-between ${getBorderClass(p.estadoUI)}`;

            const isBlocked = p.bloqueos && p.bloqueos.length > 0;

            const canAction = p.accionesPermitidas && p.accionesPermitidas.length > 0;
            const isMandatory = data.siguienteAccion === 'IR_A_PROCESO' && data.actionPayload?.proceso_id == p.id;

            card.innerHTML = `
                <div class="process-card-content">
                    <h3 class="mb-1 font-lg">${p.nombre}</h3>
                    <div class="d-flex justify-between align-center">
                        <span class="badge ${getBadgeClass(p.estadoUI)}">${p.estadoUI}</span>
                        <small class="text-secondary">${p.ultimaActualizacion}</small>
                    </div>
                    ${isBlocked ? `
                        <div class="mt-1 font-xs text-error text-bold">
                            <i data-lucide="lock" class="icon-xs v-middle"></i>
                            ${p.bloqueos[0]}
                        </div>
                    ` : ''}
                </div>
                <div class="process-card-footer">
                    <button class="btn ${isMandatory ? 'btn-primary' : 'btn-secondary'} btn-registrar minw-120"
                            data-id="${p.id}" data-nombre="${p.nombre}"
                            ${(!canAction || (data.siguienteAccion === 'IR_A_PROCESO' && !isMandatory)) ? 'disabled' : ''}>
                        ${b.estado === 'CERRADA' ? 'Ver Histórico' : (isMandatory ? 'REGISTRO OBLIGATORIO' : p.siguienteAccion)}
                    </button>
                </div>
            `;
            gridProcesos.appendChild(card);
        });

        // Lógica de habilitación de cierre
        btnCerrar.disabled = data.estadoTurno !== 'LISTO_PARA_CIERRE' || b.estado === 'CERRADA';
        if (b.estado === 'CERRADA') btnCerrar.classList.add('d-none');
        else btnCerrar.classList.remove('d-none');

        if (b.estado === 'CERRADA') {
            // Ceremonial histórico: Cambiar visual completa
            document.body.classList.add('historical-mode');

            const alertCerrada = document.createElement('div');
            alertCerrada.className = 'card historical-alert';
            alertCerrada.innerHTML = `
                <i data-lucide="lock" class="icon-huge mb-2"></i>
                <h1 class="m-0 font-2xl">BITÁCORA CERRADA E INMUTABLE</h1>
                <p>Este turno ha sido finalizado y auditado. No se permiten más cambios.</p>
            `;
            viewAbierta.prepend(alertCerrada);
        }

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

    function getBorderClass(estado) {
        if (!estado) return '';
        if (estado.includes('Sin datos')) return 'border-l-secondary-8';
        if (estado.includes('Esperando')) return 'border-l-warning-8';
        if (estado.includes('Parcial')) return 'border-l-warning-8';
        if (estado.includes('Completo')) return 'border-l-success-8';
        if (estado.includes('Revisión')) return 'border-l-danger-8';
        return '';
    }

    function getBadgeClass(estado) {
        if (!estado) return '';
        if (estado.includes('Sin datos')) return 'badge-outline';
        if (estado.includes('Esperando')) return 'badge-warning';
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
                DesignSystem.showErrorModal('Error al Abrir', result.error || 'No se pudo abrir la bitácora de turno.');
            }
        } catch (error) {
            console.error('Error al abrir:', error);
        }
    });

    // --- CIERRE (EVENTO IRREVERSIBLE) ---
    btnCerrar.addEventListener('click', async () => {
        if (btnCerrar.disabled) return;

        // Obtener estado completo para el resumen
        const res = await fetch('/api/bitacora/estado');
        const state = (await res.json()).data;
        const resumenCierre = state.resumenCierre || [];

        document.getElementById('modal-turno-text').textContent = currentBitacora.turno;
        document.getElementById('modal-fecha-text').textContent = currentBitacora.fecha_operativa;

        const resumenContainer = document.getElementById('resumen-cierre-container');
        resumenContainer.innerHTML = resumenCierre.map(p => `
            <div class="resumen-item">
                <span>${p.nombre}:</span>
                <span class="text-bold">
                    ${p.produccion} ${p.unidad}
                    <i data-lucide="${p.calidadValidada ? 'shield-check' : 'shield-alert'}"
                       class="icon-xs v-middle ${p.calidadValidada ? 'text-success' : 'text-error'}"></i>
                </span>
            </div>
        `).join('');

        checklistProcesos.innerHTML = '';
        let hasRevision = false;

        procesosTurno.forEach(p => {
            const item = document.createElement('div');
            item.className = 'checklist-item';

            const labelClass = p.estado.includes('Completo') ? 'text-success' : 'text-error';
            const icon = p.estado.includes('Completo') ? 'check-circle' : 'alert-circle';

            if (p.estado.includes('Revisión')) hasRevision = true;

            item.innerHTML = `
                <span><i data-lucide="${icon}" class="icon-xs v-middle ${labelClass} mr-1"></i> ${p.nombre}</span>
                <span class="text-bold ${labelClass}">${p.estado}</span>
            `;
            checklistProcesos.appendChild(item);
        });

        containerRevision.style.display = hasRevision ? 'block' : 'none';
        obsRevision.required = hasRevision;

        const checkFinal = document.getElementById('check-confirmacion-final');
        checkFinal.checked = false;
        confirmarCierre.disabled = true;

        checkFinal.onchange = (e) => {
            confirmarCierre.disabled = !e.target.checked;
        };

        modalCierre.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    });

    confirmarCierre.addEventListener('click', async () => {
        if (containerRevision.style.display === 'block' && !obsRevision.value.trim()) {
            DesignSystem.showErrorModal('Motivo Requerido', 'Por favor, ingrese el motivo de revisión de los procesos marcados.');
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
                DesignSystem.showErrorModal('Error al Cerrar', 'No se pudo cerrar la bitácora: ' + (res.error || res.message));
            }
        } catch (error) {
            console.error('Error al cerrar:', error);
        }
    });

    cancelarCierre.onclick = () => { modalCierre.style.display = 'none'; };

    checkEstado();
});
