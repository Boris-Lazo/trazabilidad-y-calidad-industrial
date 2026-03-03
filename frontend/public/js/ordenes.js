
document.addEventListener('DOMContentLoaded', () => {
    const formCrearOrden = document.getElementById('form-crear-orden');
    const tablaOrdenesBody = document.querySelector('#tabla-ordenes tbody');
    const mensajeCreacion = document.getElementById('mensaje-creacion');
    const procesoSelect = document.getElementById('proceso_select');
    const codigoOrdenInput = document.getElementById('codigo_orden');
    const unidadInput = document.getElementById('unidad');
    const filtroEstado = document.getElementById('filtro-estado');

    const modalCierre = document.getElementById('modal-cierre-orden');
    const cierreOrdenInfo = document.getElementById('cierre-orden-info');
    const motivoCierreInput = document.getElementById('motivo-cierre');
    const confirmarCierreBtn = document.getElementById('confirmar-cierre-btn');
    const cancelarCierre = document.getElementById('cancelar-cierre');

    let ordenSeleccionadaParaCierre = null;

    const UNIDADES_PROCESO = {
        '1': 'kg', // Extrusor PP
        '2': 'metros', // Telares
        '3': 'metros', // Laminado
        '4': 'impresiones', // Imprenta
        '5': 'unidades', // Conversión sacos
        '6': 'kg', // Extrusión PE
        '7': 'unidades', // Conversión liner
        '8': 'kg', // Peletizado
        '9': 'unidades' // Sacos vestidos
    };

    procesoSelect.addEventListener('change', () => {
        const val = procesoSelect.value;
        unidadInput.value = UNIDADES_PROCESO[val] || '';

        // Auto-completar el primer dígito si está vacío
        if (!codigoOrdenInput.value) {
            codigoOrdenInput.value = val;
        } else if (codigoOrdenInput.value.length > 0) {
            codigoOrdenInput.value = val + codigoOrdenInput.value.substring(1);
        }
    });

    codigoOrdenInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length > 0) {
            const firstDigit = val[0];
            if (UNIDADES_PROCESO[firstDigit]) {
                procesoSelect.value = firstDigit;
                unidadInput.value = UNIDADES_PROCESO[firstDigit];
            }
        }
    });

    // Función para cargar y mostrar las órdenes de producción
    async function cargarOrdenes() {
        try {
            const estado = filtroEstado.value;
            const url = `/api/ordenes-produccion${estado ? `?estado=${estado}` : ''}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Error al cargar las órdenes.');
            }
            const result = await response.json();
            const ordenes = result.data || [];

            tablaOrdenesBody.innerHTML = ''; // Limpiar la tabla antes de llenarla

            if (ordenes.length === 0) {
                tablaOrdenesBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay órdenes registradas.</td></tr>';
                return;
            }

            ordenes.forEach(orden => {
                let badgeClass = 'badge-info';
                if (orden.estado === 'Liberada') badgeClass = 'badge-success';
                if (orden.estado === 'Cerrada') badgeClass = 'badge-outline';
                if (orden.estado === 'Cancelada') badgeClass = 'badge-error';
                if (orden.estado === 'En producción') badgeClass = 'badge-warning';
                if (orden.estado === 'Pausada') badgeClass = 'badge-warning';

                const progreso = orden.cantidad_objetivo > 0
                    ? Math.round((orden.cantidad_producida / orden.cantidad_objetivo) * 100)
                    : 0;

                const fila = `
                    <tr data-id="${orden.id}">
                        <td><strong>#${orden.codigo_orden}</strong></td>
                        <td>${orden.producto || 'N/A'}</td>
                        <td>${orden.cantidad_objetivo || 0} ${orden.unidad || ''}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span>${orden.cantidad_producida || 0}</span>
                                <small style="color: var(--text-muted);">(${progreso}%)</small>
                            </div>
                        </td>
                        <td>${orden.merma_total || 0} kg</td>
                        <td><span class="badge ${badgeClass}">${orden.estado}</span></td>
                        <td><span class="badge ${progreso >= 100 ? 'badge-success' : 'badge-info'}">${progreso >= 100 ? 'OK' : 'Pend.'}</span></td>
                        <td>
                            <div style="display: flex; gap: 0.5rem;">
                                <a href="/detalles_orden.html?id=${orden.id}" class="button button-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Ver</a>
                                ${orden.estado === 'Creada' ? `<button class="button button-primary btn-liberar" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Liberar</button>` : ''}
                                ${['Liberada', 'En producción', 'Pausada', 'Creada'].includes(orden.estado) ?
                                    `<button class="button button-outline btn-abrir-cierre" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--danger);">Cerrar</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
                tablaOrdenesBody.innerHTML += fila;
            });

            // Re-asignar eventos
            document.querySelectorAll('.btn-liberar').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.closest('tr').dataset.id;
                    cambiarEstado(id, 'Liberada');
                });
            });

            document.querySelectorAll('.btn-abrir-cierre').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tr = e.target.closest('tr');
                    ordenSeleccionadaParaCierre = {
                        id: tr.dataset.id,
                        codigo: tr.querySelector('strong').textContent
                    };
                    cierreOrdenInfo.textContent = `Vas a cerrar la orden ${ordenSeleccionadaParaCierre.codigo}`;
                    modalCierre.style.display = 'flex';
                });
            });

        } catch (error) {
            console.error('Error:', error);
            tablaOrdenesBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger);">Error al cargar los datos.</td></tr>';
        }
    }

    async function cambiarEstado(id, nuevoEstado, motivo = null) {
        try {
            const body = { estado: nuevoEstado };
            if (motivo) body.motivo_cierre = motivo;

            const response = await fetch(`/api/ordenes-produccion/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || 'No se pudo cambiar el estado.');
            }

            cargarOrdenes();
        } catch (error) {
            DesignSystem.showErrorModal('Error al Cambiar Estado', error.message);
        }
    }

    filtroEstado.addEventListener('change', cargarOrdenes);

    cancelarCierre.addEventListener('click', () => {
        modalCierre.style.display = 'none';
        motivoCierreInput.value = '';
    });

    confirmarCierreBtn.addEventListener('click', () => {
        const motivo = motivoCierreInput.value.trim();
        if (!motivo) {
            DesignSystem.showErrorModal('Motivo Requerido', 'Debe indicar un motivo para cerrar la orden.');
            return;
        }
        cambiarEstado(ordenSeleccionadaParaCierre.id, 'Cerrada', motivo);
        modalCierre.style.display = 'none';
        motivoCierreInput.value = '';
    });

    // Función para manejar el envío del formulario de creación
    formCrearOrden.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensajeCreacion.textContent = '';

        const formData = new FormData(formCrearOrden);
        const data = Object.fromEntries(formData.entries());

        // Convertir tipos
        data.cantidad_objetivo = parseFloat(data.cantidad_objetivo);

        try {
            const response = await fetch('/api/ordenes-produccion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo crear la orden.');
            }

            const resultado = result.data;
            mensajeCreacion.innerHTML = `<span style="color: var(--success); font-weight: 500;">¡Orden #${resultado.codigo_orden || resultado.id} creada con éxito!</span>`;
            formCrearOrden.reset(); // Limpiar el formulario
            cargarOrdenes(); // Recargar la lista de órdenes

        } catch (error) {
            console.error('Error al crear la orden:', error);
            mensajeCreacion.innerHTML = `<span style="color: var(--danger); font-weight: 500;">Error: ${error.message}</span>`;
        }
    });

    // Cargar las órdenes al iniciar la página
    cargarOrdenes();
});
