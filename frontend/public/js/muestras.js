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
            
            const result = await response.json();
            const lotes = result.data || [];

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

            const result = await response.json();
            const muestras = result.data || [];
            tablaMuestrasBody.innerHTML = ''; // Limpiar la tabla

            if (muestras.length === 0) {
                tablaMuestrasBody.innerHTML = '<tr><td colspan="5" class="text-center">No hay muestras de calidad registradas.</td></tr>';
                return;
            }

            muestras.forEach(muestra => {
                const badgeClass = muestra.resultado === 'aprobado' ? 'badge-success' : 'badge-error';
                const fila = `
                    <tr>
                        <td><strong>#${muestra.id}</strong></td>
                        <td>Lote #${muestra.lote_produccion_id}</td>
                        <td><span class="badge ${badgeClass}">${muestra.resultado}</span></td>
                        <td>${muestra.observaciones || '<span class="text-muted">Sin observaciones</span>'}</td>
                        <td class="text-muted">${new Date(muestra.fecha_registro).toLocaleString()}</td>
                    </tr>
                `;
                tablaMuestrasBody.innerHTML += fila;
            });

        } catch (error) {
            console.error('Error cargando muestras:', error);
            tablaMuestrasBody.innerHTML = '<tr><td colspan="5" class="text-center text-error">Error al cargar los datos.</td></tr>';
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
            mensajeCreacion.innerHTML = '<span class="text-error">Por favor, complete todos los campos requeridos.</span>';
            return;
        }

        try {
            const response = await fetch('/api/muestras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosMuestra)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo registrar la muestra.');
            }

            const resultado = result.data;
            mensajeCreacion.innerHTML = `<span class="text-success text-bold">¡Muestra #${resultado.id} registrada con éxito!</span>`;
            formCrearMuestra.reset();
            cargarMuestras(); // Recargar la lista de muestras

        } catch (error) {
            console.error('Error al registrar la muestra:', error);
            mensajeCreacion.innerHTML = `<span class="text-error">Error: ${error.message}</span>`;
        }
    });

    // Carga inicial de datos
    cargarLotes();
    cargarMuestras();
});
