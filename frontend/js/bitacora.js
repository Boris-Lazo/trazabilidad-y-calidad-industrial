
document.addEventListener('DOMContentLoaded', () => {
    const turnoInfo = document.getElementById('turno-info');
    const labelFecha = document.getElementById('label-fecha-operativa');
    const labelTurno = document.getElementById('label-turno');
    const labelEstado = document.getElementById('label-estado-bitacora');

    const noActiveDiv = document.getElementById('no-active-bitacora');
    const activeContentDiv = document.getElementById('active-bitacora-content');

    const btnAbrir = document.getElementById('btn-abrir-bitacora');
    const btnCerrar = document.getElementById('btn-cerrar-turno');
    const btnConfirmarCierre = document.getElementById('btn-confirmar-cierre');
    const btnCancelarCierre = document.getElementById('btn-cancelar-cierre');
    const modalCierre = document.getElementById('modal-cierre');

    const listaProcesosBody = document.getElementById('lista-procesos-body');

    let currentBitacora = null;

    async function checkBitacora() {
        try {
            const res = await fetch('/api/bitacora/current');
            if (res.ok) {
                currentBitacora = await res.json();
                showActiveBitacora();
            } else {
                showNoActive();
            }
        } catch (error) {
            console.error('Error checking bitacora:', error);
        }
    }

    function showActiveBitacora() {
        noActiveDiv.style.display = 'none';
        activeContentDiv.style.display = 'block';

        labelFecha.textContent = new Date(currentBitacora.fecha_operativa).toLocaleDateString();
        labelTurno.textContent = `Turno ${currentBitacora.turno}`;
        labelEstado.textContent = currentBitacora.estado === 'en_curso' ? 'En Curso' : 'Cerrado';
        labelEstado.className = `badge ${currentBitacora.estado === 'en_curso' ? 'badge-success' : 'badge-info'}`;

        cargarEstadosProcesos();
        cargarStats();
    }

    async function cargarStats() {
        try {
            const res = await fetch(`/api/bitacora/${currentBitacora.id}/stats`);
            const stats = await res.json();

            document.getElementById('stat-registros').textContent = stats.total_registros || 0;
            document.getElementById('stat-muestras').textContent = stats.total_muestras || 0;
            document.getElementById('stat-merma').textContent = `${(stats.total_merma || 0).toFixed(2)} kg`;
        } catch (error) {
            console.error('Error cargando stats:', error);
        }
    }

    function showNoActive() {
        noActiveDiv.style.display = 'block';
        activeContentDiv.style.display = 'none';
        labelEstado.textContent = 'Sin bitácora';
        labelEstado.className = 'badge badge-error';
    }

    async function cargarEstadosProcesos() {
        try {
            const res = await fetch(`/api/bitacora/${currentBitacora.id}/status`);
            const procesos = await res.json();

            listaProcesosBody.innerHTML = '';
            procesos.forEach(p => {
                const estadoRegistro = p.num_registros > 0 ?
                    '<span class="badge badge-success">Completo</span>' :
                    '<span class="badge badge-warning">Sin datos</span>';

                const fila = `
                    <tr>
                        <td><strong>${p.nombre}</strong></td>
                        <td>${estadoRegistro}</td>
                        <td>${p.num_registros > 0 ? 'Hace un momento' : '---'}</td>
                        <td style="text-align: right;">
                            <a href="/registro_proceso.html?procesoId=${p.id}&bitacoraId=${currentBitacora.id}" class="button button-outline">
                                Registrar
                            </a>
                        </td>
                    </tr>
                `;
                listaProcesosBody.innerHTML += fila;
            });
        } catch (error) {
            console.error('Error cargando procesos:', error);
        }
    }

    btnAbrir.addEventListener('click', async () => {
        try {
            const infoRes = await fetch('/api/bitacora/suggested');
            const info = await infoRes.json();

            const res = await fetch('/api/bitacora/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha_operativa: info.fecha_operativa,
                    turno: info.turno,
                    usuario_id: 1 // Hardcoded admin por simplicidad
                })
            });
            if (res.ok) {
                checkBitacora();
            }
        } catch (error) {
            console.error('Error abriendo bitacora:', error);
        }
    });

    btnCerrar.addEventListener('click', async () => {
        // Verificar si hay procesos sin datos
        const res = await fetch(`/api/bitacora/${currentBitacora.id}/status`);
        const procesos = await res.json();

        const sinDatos = procesos.filter(p => p.num_registros === 0);
        const listaAlertas = document.getElementById('lista-alertas');
        const alertasDiv = document.getElementById('alertas-cierre');

        listaAlertas.innerHTML = '';
        if (sinDatos.length > 0) {
            alertasDiv.style.display = 'block';
            sinDatos.forEach(p => {
                listaAlertas.innerHTML += `<li>Proceso <strong>${p.nombre}</strong> no tiene registros en este turno.</li>`;
            });
        } else {
            alertasDiv.style.display = 'none';
        }

        modalCierre.style.display = 'flex';
    });

    btnCancelarCierre.addEventListener('click', () => {
        modalCierre.style.display = 'none';
    });

    btnConfirmarCierre.addEventListener('click', async () => {
        const resumen = document.getElementById('resumen-cierre').value;
        try {
            const res = await fetch(`/api/bitacora/${currentBitacora.id}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumen })
            });
            if (res.ok) {
                modalCierre.style.display = 'none';
                checkBitacora();
            }
        } catch (error) {
            console.error('Error cerrando bitacora:', error);
        }
    });

    checkBitacora();
});
