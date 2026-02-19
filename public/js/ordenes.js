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
                tablaOrdenesBody.innerHTML = '<tr><td colspan="5">No hay órdenes de producción.</td></tr>';
                return;
            }

            ordenes.forEach(orden => {
                const fila = `
                    <tr>
                        <td>${orden.id}</td>
                        <td>${orden.producto}</td>
                        <td>${orden.cantidad}</td>
                        <td><span class="status status-${orden.estado.toLowerCase()}">${orden.estado}</span></td>
                        <td>${new Date(orden.fecha_inicio).toLocaleString()}</td>
                    </tr>
                `;
                tablaOrdenesBody.innerHTML += fila;
            });

        } catch (error) {
            console.error('Error:', error);
            tablaOrdenesBody.innerHTML = '<tr><td colspan="5">Error al cargar los datos.</td></tr>';
        }
    }

    // Función para manejar el envío del formulario de creación
    formCrearOrden.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensajeCreacion.textContent = '';

        const producto = document.getElementById('producto').value;
        const cantidad = document.getElementById('cantidad').value;

        try {
            const response = await fetch('/api/ordenes-produccion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    producto,
                    cantidad: parseInt(cantidad, 10),
                    // La fecha de inicio y el estado se asignan en el backend
                }),
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.error || 'No se pudo crear la orden.');
            }

            mensajeCreacion.textContent = `¡Orden #${resultado.id} creada con éxito!`;
            mensajeCreacion.style.color = 'green';
            formCrearOrden.reset(); // Limpiar el formulario
            cargarOrdenes(); // Recargar la lista de órdenes

        } catch (error) {
            console.error('Error al crear la orden:', error);
            mensajeCreacion.textContent = `Error: ${error.message}`;
            mensajeCreacion.style.color = 'red';
        }
    });

    // Cargar las órdenes al iniciar la página
    cargarOrdenes();
});
