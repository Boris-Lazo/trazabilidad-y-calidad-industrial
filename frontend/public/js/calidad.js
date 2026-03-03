document.addEventListener('DOMContentLoaded', () => {
    const listaCalidadBody = document.getElementById('lista-calidad');
    const container = document.querySelector('.page-content');

    // Elemento para mostrar las muestras (panel debajo de la tabla)
    const panelMuestras = document.createElement('div');
    panelMuestras.id = 'panel-muestras';
    panelMuestras.className = 'card';
    panelMuestras.style.marginTop = '2rem';
    panelMuestras.style.display = 'none';
    container.appendChild(panelMuestras);

    async function cargarLotesPendientes() {
        try {
            const res = await fetch('/api/lotes');
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Error al cargar lotes');

            const lotes = result.data.filter(l => l.estado === 'activo' || l.estado === 'pausado');

            listaCalidadBody.innerHTML = '';
            if (lotes.length === 0) {
                listaCalidadBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No hay lotes pendientes de evaluación.</td></tr>';
                return;
            }

            lotes.forEach(lote => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${lote.id}</td>
                    <td><strong>${lote.codigo_lote}</strong></td>
                    <td>${lote.proceso_nombre}</td>
                    <td>Orden #${lote.orden_id}</td>
                    <td><span class="badge ${lote.estado === 'activo' ? 'badge-success' : 'badge-warning'}">${lote.estado}</span></td>
                    <td style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary btn-sm" onclick="verMuestras(${lote.id}, '${lote.codigo_lote}')">Ver Muestras</button>
                        <button class="btn btn-outline btn-sm" onclick="cerrarLote(${lote.id})">Cerrar Lote</button>
                    </td>
                `;
                listaCalidadBody.appendChild(fila);
            });
        } catch (error) {
            listaCalidadBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">${error.message}</td></tr>`;
        }
    }

    window.verMuestras = async (id, codigo) => {
        panelMuestras.innerHTML = '<div style="padding: 2rem; text-align: center;">Cargando muestras...</div>';
        panelMuestras.style.display = 'block';
        panelMuestras.scrollIntoView({ behavior: 'smooth' });

        try {
            const res = await fetch(`/api/muestras/lote/${id}`);
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Error al obtener muestras');

            const muestras = result.data || [];
            panelMuestras.innerHTML = `
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>Resultados de Calidad: ${codigo}</span>
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('panel-muestras').style.display='none'">Cerrar Panel</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Parámetro</th>
                                <th>Valor</th>
                                <th>Resultado</th>
                                <th>Fecha Registro</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${muestras.length > 0 ? muestras.map(m => `
                                <tr>
                                    <td>${m.parametro}</td>
                                    <td>${m.valor}</td>
                                    <td><span class="badge ${m.resultado === 'Cumple' ? 'badge-success' : 'badge-error'}">${m.resultado}</span></td>
                                    <td style="color: var(--text-muted); font-size: 0.8rem;">${new Date(m.fecha_registro).toLocaleString()}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" style="text-align: center;">No hay muestras registradas para este lote.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            panelMuestras.innerHTML = `<div class="badge badge-error" style="margin: 1rem; padding: 1rem; text-align: center; width: calc(100% - 2rem);">${error.message}</div>`;
        }
    };

    window.cerrarLote = async (id) => {
        const motivo = prompt("Motivo de cierre:");
        if (motivo === null) return; // Cancelado

        try {
            const res = await fetch(`/api/lotes/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'cerrado', comentario: motivo })
            });

            if (!res.ok) throw new Error('Error al cerrar el lote');

            cargarLotesPendientes();
            panelMuestras.style.display = 'none';
            DesignSystem.showToast("Lote cerrado con éxito.", "success");
        } catch (error) {
            DesignSystem.showErrorModal("Error al Cerrar Lote", error.message);
        }
    };

    cargarLotesPendientes();
});
