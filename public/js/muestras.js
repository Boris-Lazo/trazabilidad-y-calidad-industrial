document.addEventListener('DOMContentLoaded', () => {
    const formCrearMuestra = document.getElementById('form-crear-muestra');
    const tablaMuestrasBody = document.querySelector('#tabla-muestras tbody');
    const mensajeCreacion = document.getElementById('mensaje-creacion');
    const selectLotes = document.getElementById('lote-produccion-id');

    // Función para cargar los lotes de producción en el selector
    async function cargarLotes() {
        try {
            const response = await fetch('/api/lotes');
            if (!response.ok) throw new Error('No se pudieron cargar los lotes.');
            
            const lotes = await response.json();

            selectLotes.innerHTML = '<option value="">Seleccione un lote</option>'; // Opción por defecto

            if (lotes.length === 0) {
                selectLotes.innerHTML = '<option value="">No hay lotes disponibles</option>';
                return;
            }

            lotes.forEach(lote => {
                const option = document.createElement('option');
                option.value = lote.id;
                option.textContent = `Lote #${lote.id} (Orden #${lote.orden_produccion_id})`
                selectLotes.appendChild(option);
            });

        } catch (error) {
            console.error('Error cargando lotes:', error);
            selectLotes.innerHTML = '<option value="">Error al cargar lotes</option>';
        }
    }

    // Función para cargar y mostrar las muestras de calidad
    async function cargarMuestras() {
        try {
            const response = await fetch('/api/muestras');
            if (!response.ok) throw new Error('Error al cargar las muestras.');

            const muestras = await response.json();
            tablaMuestrasBody.innerHTML = ''; // Limpiar la tabla

            if (muestras.length === 0) {
                tablaMuestrasBody.innerHTML = '<tr><td colspan="5">No hay muestras de calidad registradas.</td></tr>';
                return;
            }

            muestras.forEach(muestra => {
                const fila = `
                    <tr>
                        <td>${muestra.id}</td>
                        <td>${muestra.lote_produccion_id}</td>
                        <td class="${muestra.resultado === 'aprobado' ? 'texto-exito' : 'texto-error'}">${muestra.resultado}</td>
                        <td>${muestra.observaciones || 'N/A'}</td>
                        <td>${new Date(muestra.fecha_registro).toLocaleString()}</td>
                    </tr>
                `;
                tablaMuestrasBody.innerHTML += fila;
            });

        } catch (error) {
            console.error('Error cargando muestras:', error);
            tablaMuestrasBody.innerHTML = '<tr><td colspan="5">Error al cargar los datos.</td></tr>';
        }
    }

    // Manejar el envío del formulario para crear una nueva muestra
    formCrearMuestra.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensajeCreacion.textContent = '';
        
        const formData = new FormData(formCrearMuestra);
        const datosMuestra = {
            lote_produccion_id: parseInt(formData.get('lote-produccion-id')),
            resultado: formData.get('resultado'),
            observaciones: formData.get('observaciones'),
        };

        if (!datosMuestra.lote_produccion_id || !datosMuestra.resultado) {
            mensajeCreacion.textContent = 'Por favor, complete todos los campos requeridos.';
            mensajeCreacion.style.color = 'red';
            return;
        }

        try {
            const response = await fetch('/api/muestras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosMuestra)
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.error || 'No se pudo registrar la muestra.');
            }

            mensajeCreacion.textContent = `¡Muestra #${resultado.id} registrada con éxito!`;
            mensajeCreacion.style.color = 'green';
            formCrearMuestra.reset();
            cargarMuestras(); // Recargar la lista de muestras

        } catch (error) {
            console.error('Error al registrar la muestra:', error);
            mensajeCreacion.textContent = `Error: ${error.message}`;
            mensajeCreacion.style.color = 'red';
        }
    });

    // Carga inicial de datos
    cargarLotes();
    cargarMuestras();
});
