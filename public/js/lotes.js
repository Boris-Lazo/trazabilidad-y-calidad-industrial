document.addEventListener('DOMContentLoaded', () => {
    const formCrearLote = document.getElementById('form-crear-lote');
    const tablaLotesBody = document.querySelector('#tabla-lotes tbody');
    const mensajeCreacion = document.getElementById('mensaje-creacion');
    const selectOrdenes = document.getElementById('orden-produccion-id');

    // Función para cargar las órdenes de producción en el selector
    async function cargarOrdenes() {
        try {
            const response = await fetch('/api/ordenes-produccion');
            if (!response.ok) throw new Error('No se pudieron cargar las órdenes.');
            
            const ordenes = await response.json();

            selectOrdenes.innerHTML = '<option value="">Seleccione una orden</option>'; // Opción por defecto

            if (ordenes.length === 0) {
                selectOrdenes.innerHTML = '<option value="">No hay órdenes disponibles</option>';
                return;
            }

            ordenes.forEach(orden => {
                const option = document.createElement('option');
                option.value = orden.id;
                option.textContent = `Orden #${orden.id} - ${orden.producto}`;
                selectOrdenes.appendChild(option);
            });

        } catch (error) {
            console.error('Error cargando órdenes:', error);
            selectOrdenes.innerHTML = '<option value="">Error al cargar órdenes</option>';
        }
    }

    // Función para cargar y mostrar los lotes de producción
    async function cargarLotes() {
        try {
            const response = await fetch('/api/lotes');
            if (!response.ok) throw new Error('Error al cargar los lotes.');

            const lotes = await response.json();
            tablaLotesBody.innerHTML = ''; // Limpiar la tabla

            if (lotes.length === 0) {
                tablaLotesBody.innerHTML = '<tr><td colspan="3">No hay lotes de producción.</td></tr>';
                return;
            }

            lotes.forEach(lote => {
                const fila = `
                    <tr>
                        <td>${lote.id}</td>
                        <td>${lote.orden_produccion_id}</td>
                        <td>${new Date(lote.fecha_creacion).toLocaleString()}</td>
                    </tr>
                `;
                tablaLotesBody.innerHTML += fila;
            });

        } catch (error) {
            console.error('Error cargando lotes:', error);
            tablaLotesBody.innerHTML = '<tr><td colspan="3">Error al cargar los datos.</td></tr>';
        }
    }

    // Manejar el envío del formulario para crear un nuevo lote
    formCrearLote.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensajeCreacion.textContent = '';
        
        const orden_produccion_id = selectOrdenes.value;

        if (!orden_produccion_id) {
            mensajeCreacion.textContent = 'Por favor, seleccione una orden de producción.';
            mensajeCreacion.style.color = 'red';
            return;
        }

        try {
            const response = await fetch('/api/lotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orden_produccion_id: parseInt(orden_produccion_id) })
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.error || 'No se pudo crear el lote.');
            }

            mensajeCreacion.textContent = `¡Lote #${resultado.id} creado con éxito para la orden #${resultado.orden_produccion_id}!`;
            mensajeCreacion.style.color = 'green';
            formCrearLote.reset();
            cargarLotes(); // Recargar la lista de lotes

        } catch (error) {
            console.error('Error al crear el lote:', error);
            mensajeCreacion.textContent = `Error: ${error.message}`;
            mensajeCreacion.style.color = 'red';
        }
    });

    // Carga inicial de datos
    cargarOrdenes();
    cargarLotes();
});
