
document.addEventListener('DOMContentLoaded', () => {
    const formCrearOrden = document.getElementById('form-crear-orden');
    const tablaOrdenesBody = document.querySelector('#tabla-ordenes tbody');
    const mensajeCreacion = document.getElementById('mensaje-creacion');

    // Función para cargar y mostrar las órdenes de producción
    async function cargarOrdenes() {
        try {
            const response = await fetch('/api/ordenes-produccion');
            if (!response.ok) {
                throw new Error('Error al cargar las órdenes.');
            }
            const ordenes = await response.json();

            tablaOrdenesBody.innerHTML = ''; // Limpiar la tabla antes de llenarla

            if (ordenes.length === 0) {
                tablaOrdenesBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay órdenes de producción registradas.</td></tr>';
                return;
            }

            ordenes.forEach(orden => {
                let badgeClass = 'badge-info';
                if (orden.estado === 'completado') badgeClass = 'badge-success';
                if (orden.estado === 'cancelado') badgeClass = 'badge-error';
                if (orden.estado === 'en proceso') badgeClass = 'badge-warning';

                const fila = `
                    <tr>
                        <td><strong>#${orden.codigo_orden || orden.id}</strong></td>
                        <td>${orden.producto || 'N/A'}</td>
                        <td>${orden.cantidad_objetivo || 0} ${orden.unidad || ''}</td>
                        <td>${orden.cantidad_producida || 0}</td>
                        <td>${orden.merma_total || 0} kg</td>
                        <td><span class="badge ${badgeClass}">${orden.estado}</span></td>
                        <td><span class="badge badge-info">Pendiente</span></td>
                        <td>
                            <div style="display: flex; gap: 0.5rem;">
                                <a href="/detalles_orden.html?id=${orden.id}" class="button button-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Ver</a>
                                <button class="button button-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Cerrar</button>
                            </div>
                        </td>
                    </tr>
                `;
                tablaOrdenesBody.innerHTML += fila;
            });

        } catch (error) {
            console.error('Error:', error);
            tablaOrdenesBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger);">Error al cargar los datos.</td></tr>';
        }
    }

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

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.error || 'No se pudo crear la orden.');
            }

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
