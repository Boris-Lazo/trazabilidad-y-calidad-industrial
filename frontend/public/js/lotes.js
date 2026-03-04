document.addEventListener('DOMContentLoaded', () => {
    const tablaLotesBody = document.querySelector('#tabla-lotes tbody');

    async function cargarLotes() {
        try {
            const response = await fetch('/api/lotes/disponibles');
            if (!response.ok) throw new Error('Error al cargar los lotes.');

            const result = await response.json();
            const lotes = result.data || [];
            tablaLotesBody.innerHTML = '';

            if (lotes.length === 0) {
                tablaLotesBody.innerHTML = '<tr><td colspan="5" class="text-center">No hay lotes de producción registrados.</td></tr>';
                return;
            }

            lotes.forEach(lote => {
                const fila = `
                    <tr>
                        <td><strong>${lote.codigo_lote}</strong></td>
                        <td>${lote.proceso_nombre}</td>
                        <td>Orden #${lote.orden_id}</td>
                        <td><span class="badge ${lote.estado === 'activo' ? 'badge-success' : (lote.estado === 'pausado' ? 'badge-warning' : 'badge-info')}">${lote.estado}</span></td>
                        <td>
                            <div class="d-flex gap-1">
                                <button class="btn btn-secondary btn-sm" onclick="verTrazabilidad(${lote.id})">Trazabilidad</button>
                                ${lote.estado !== 'cerrado' ? `<button class="btn btn-outline btn-sm" onclick="cambiarEstado(${lote.id})">Estado</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
                tablaLotesBody.innerHTML += fila;
            });

        } catch (error) {
            console.error('Error cargando lotes:', error);
        tablaLotesBody.innerHTML = '<tr><td colspan="5" class="text-center text-error">Error al cargar los datos.</td></tr>';
        }
    }

    window.verTrazabilidad = (id) => {
        window.location.href = `/trazabilidad.html?lote_id=${id}`;
    };

    window.cambiarEstado = async (id) => {
        const nuevoEstado = prompt("Nuevo estado (activo, pausado, cerrado):");
        if (!nuevoEstado || !['activo', 'pausado', 'cerrado'].includes(nuevoEstado.toLowerCase())) {
            if (nuevoEstado) DesignSystem.showErrorModal("Estado Inválido", "El estado seleccionado no es válido.");
            return;
        }

        const comentario = prompt("Comentario/Motivo del cambio:");
        if (comentario === null) return;

        try {
            const res = await fetch(`/api/lotes/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado.toLowerCase(), comentario })
            });

            if (res.ok) {
                DesignSystem.showToast("Estado actualizado correctamente.", "success");
                cargarLotes();
            } else {
                const err = await res.json();
                DesignSystem.showErrorModal("Error al Cambiar Estado", err.error || "No se pudo actualizar el estado del lote.");
            }
        } catch (e) {
            DesignSystem.showErrorModal("Error de Conexión", "Hubo un fallo al intentar conectar con el servidor.");
        }
    };

    cargarLotes();
});
