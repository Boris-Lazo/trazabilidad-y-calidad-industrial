
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

    function showApertura() {
        viewApertura.style.display = 'block';
        viewAbierta.style.display = 'none';
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

        // Visibility of closing button: only if all processes have some data or are non-operational
        const hasSinDatos = data.procesos.some(p => p.estado.includes('Sin datos'));
        btnCerrar.style.display = hasSinDatos ? 'none' : 'block';

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
        const inspector = document.getElementById('inspector').value;

        try {
            const response = await fetch('/api/bitacora/abrir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inspector })
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
        // Generar resumen para el modal
        const resumen = {
            completo: procesosTurno.filter(p => p.estado.includes('Completo')).length,
            parcial: procesosTurno.filter(p => p.estado.includes('Parcial')).length,
            revision: procesosTurno.filter(p => p.estado.includes('Revisión')).length,
            noOperativo: procesosTurno.filter(p => p.estado.includes('No operativo')).length,
            sinDatos: procesosTurno.filter(p => p.estado.includes('Sin datos')).length
        };

        const resumenDiv = document.getElementById('resumen-cierre');
        resumenDiv.innerHTML = `
            <ul style="list-style: none; padding: 0;">
                <li class="text-success">✔ ${resumen.completo} procesos completos</li>
                <li class="text-warning">🟡 ${resumen.parcial} procesos parciales</li>
                <li class="text-error">🔴 ${resumen.revision} procesos en revisión</li>
                <li class="text-error">🚫 ${resumen.noOperativo} procesos no operativos</li>
                ${resumen.sinDatos > 0 ? `<li style="color: var(--text-muted);">⚪ ${resumen.sinDatos} procesos sin datos</li>` : ''}
            </ul>
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
