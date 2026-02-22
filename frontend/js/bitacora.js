
document.addEventListener('DOMContentLoaded', () => {
    const viewApertura = document.getElementById('view-apertura');
    const viewAbierta = document.getElementById('view-abierta');
    const formAbrir = document.getElementById('form-abrir-bitacora');
    const tbodyProcesos = document.getElementById('tbody-procesos');
    const btnCerrar = document.getElementById('btn-cerrar-bitacora');
    const modalCierre = document.getElementById('modal-cierre');
    const confirmarCierre = document.getElementById('confirmar-cierre');

    let currentBitacora = null;
    let procesosTurno = [];

    async function updateClock() {
        try {
            const response = await fetch('/api/bitacora/tiempo-actual');
            const data = await response.json();

            document.getElementById('reloj-fecha').textContent = data.fecha;
            document.getElementById('reloj-hora').textContent = data.hora;
            document.getElementById('reloj-timezone').textContent = data.timezone;

            const infoHoraOperativa = document.getElementById('info-hora-operativa');
            if (infoHoraOperativa) {
                infoHoraOperativa.textContent = data.hora;
            }

            // Si no hay bitácora abierta, podríamos mostrar el turno teórico en alguna parte si quisiéramos,
            // pero el requerimiento se enfoca en la vista abierta.
        } catch (error) {
            console.error('Error al actualizar el reloj:', error);
        }
    }

    // Actualizar reloj cada minuto
    setInterval(updateClock, 60000);
    updateClock();

    async function checkEstado() {
        try {
            const response = await fetch('/api/bitacora/estado');
            const data = await response.json();

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

        // En el MVP con Autenticación, el inspector es el usuario logueado.
        const user = Auth.getUser();
        if (user) {
            document.getElementById('inspector').value = user.nombre || user.username;
            document.getElementById('inspector').readOnly = true;
        }
    }

    function showAbierta(data) {
        viewApertura.style.display = 'none';
        viewAbierta.style.display = 'block';

        const b = data.bitacora;
        document.getElementById('info-turno').textContent = b.turno;
        document.getElementById('info-fecha').textContent = b.fecha_operativa;
        document.getElementById('info-inspector').textContent = b.inspector;

        if (b.fuera_de_horario) {
            document.getElementById('warning-horario').style.display = 'block';
        }

        tbodyProcesos.innerHTML = '';
        data.procesos.forEach(p => {
            const tr = document.createElement('tr');

            let badgeClass = 'badge-info';
            if (p.estado.includes('Sin datos')) badgeClass = 'badge-outline';
            if (p.estado.includes('Parcial')) badgeClass = 'badge-warning';
            if (p.estado.includes('Completo')) badgeClass = 'badge-success';
            if (p.estado.includes('Revisión')) badgeClass = 'badge-error';
            if (p.estado.includes('No operativo')) badgeClass = 'badge-error'; // Or a specific style

            tr.innerHTML = `
                <td><strong>${p.nombre}</strong></td>
                <td><span class="badge ${badgeClass}">${p.estado}</span></td>
                <td>${p.ultimaActualizacion}</td>
                <td style="text-align: right;">
                    <button class="button ${p.accion === 'Registrar' ? 'button-primary' : 'button-outline'} btn-registrar"
                            data-id="${p.id}" data-nombre="${p.nombre}">
                        ${p.accion}
                    </button>
                </td>
            `;
            tbodyProcesos.appendChild(tr);
        });

        // Solo habilitar si todos están en Completo o Revisión
        const todosListos = data.procesos.every(p =>
            p.estado.includes('Completo') || p.estado.includes('Revisión')
        );
        btnCerrar.disabled = !todosListos;
        btnCerrar.style.opacity = todosListos ? '1' : '0.5';
        btnCerrar.title = todosListos ? 'Cerrar Bitácora' : 'Todos los procesos deben estar en estado Completo o Revisión';

        // Add event listeners to buttons
        document.querySelectorAll('.btn-registrar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const nombre = e.target.getAttribute('data-nombre');
                window.location.href = `/proceso.html?id=${id}&nombre=${encodeURIComponent(nombre)}`;
            });
        });
    }

    formAbrir.addEventListener('submit', async (e) => {
        e.preventDefault();
        // El inspector ya se envía automáticamente por el backend usando el token,
        // pero lo mantenemos en el body por compatibilidad si fuera necesario,
        // aunque el backend ahora lo ignora y usa req.user.

        try {
            const response = await fetch('/api/bitacora/abrir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ })
            });

            if (response.ok) {
                checkEstado();
            } else {
                const err = await response.json();
                alert(err.message);
            }
        } catch (error) {
            console.error('Error al abrir bitácora:', error);
        }
    });

    btnCerrar.addEventListener('click', () => {
        if (btnCerrar.disabled) return;

        // Generar resumen para el modal
        const resumen = {
            completo: procesosTurno.filter(p => p.estado.includes('Completo')).length,
            parcial: procesosTurno.filter(p => p.estado.includes('Parcial')).length,
            revision: procesosTurno.filter(p => p.estado.includes('Revisión')).length,
            sinDatos: procesosTurno.filter(p => p.estado.includes('Sin datos')).length
        };

        const resumenDiv = document.getElementById('resumen-cierre');
        let warningHtml = '';
        if (resumen.revision > 0) {
            warningHtml = `<p class="text-error" style="font-weight: bold; margin-top: 1rem;">⚠ ATENCIÓN: Hay ${resumen.revision} procesos con desviaciones o rechazos.</p>`;
        }

        resumenDiv.innerHTML = `
            <ul style="list-style: none; padding: 0;">
                <li class="text-success">🟢 ${resumen.completo} procesos completos</li>
                <li class="text-error">🔴 ${resumen.revision} procesos en revisión</li>
                ${resumen.parcial > 0 ? `<li class="text-warning">🟡 ${resumen.parcial} procesos parciales</li>` : ''}
                ${resumen.sinDatos > 0 ? `<li style="color: var(--text-muted);">⚪ ${resumen.sinDatos} procesos sin datos</li>` : ''}
            </ul>
            ${warningHtml}
        `;

        modalCierre.style.display = 'flex';
    });

    confirmarCierre.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/bitacora/${currentBitacora.id}/cerrar`, {
                method: 'POST'
            });

            if (response.ok) {
                modalCierre.style.display = 'none';
                checkEstado();
            } else {
                alert('Error al cerrar la bitácora');
            }
        } catch (error) {
            console.error('Error al cerrar:', error);
        }
    });

    checkEstado();
});
