document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.controls input');
    const searchBtn = document.querySelector('.controls button');
    const flowContainer = document.querySelector('.card:last-of-type > div');

    async function buscarTrazabilidad(id) {
        try {
            const res = await fetch(`/api/lotes/${id}/trazabilidad`);
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Error al obtener trazabilidad');
            renderTrazabilidad(result.data);
        } catch (error) {
            flowContainer.innerHTML = `<div class="badge badge-error w-100 text-center p-2">${error.message}</div>`;
        }
    }

    async function resolverIdPorCodigo(codigo) {
        try {
            const res = await fetch('/api/lotes');
            const result = await res.json();
            if (!result.success) throw new Error('No se pudo buscar el lote');
            const lote = result.data.find(l => l.codigo_lote === codigo);
            if (!lote) throw new Error('Lote no encontrado');
            return lote.id;
        } catch (error) {
            throw error;
        }
    }

    function renderTrazabilidad(data) {
        const { lote, produccion, consumos, muestras, historial_estados } = data;

        let html = `
            <div class="trazabilidad-header d-flex justify-between align-center">
                <div>
                    <span class="text-bold font-lg">LOTE: ${lote.codigo_lote}</span>
                    <span class="badge badge-info ml-2">Proceso: ${lote.proceso_nombre}</span>
                </div>
                <span class="badge ${lote.estado === 'cerrado' ? 'badge-info' : (lote.estado === 'activo' ? 'badge-success' : 'badge-warning')}">${lote.estado.toUpperCase()}</span>
            </div>

            <div class="trazabilidad-grid">
                <!-- PRODUCCIÓN -->
                <div class="card m-0">
                    <div class="card-header font-md">PRODUCCIÓN</div>
                    <div class="p-2">
                        <div class="mb-1"><strong>Máquina:</strong> ${produccion.maquina_nombre || 'N/A'}</div>
                        <div class="mb-1"><strong>Bitácora:</strong> #${produccion.bitacora_id || 'N/A'}</div>
                        <div class="mb-1"><strong>Operador:</strong> ${produccion.operador || 'N/A'}</div>
                        <div class="font-sm text-muted">Apertura: ${new Date(produccion.fecha_apertura).toLocaleString()}</div>
                    </div>
                </div>

                <!-- CONSUMOS -->
                <div class="card m-0">
                    <div class="card-header font-md">CONSUMOS (INSUMOS)</div>
                    <div class="table-container max-h-200">
                        <table class="table font-sm">
                            <thead><tr><th>Máquina</th><th>Fecha</th><th>Cant (kg)</th></tr></thead>
                            <tbody>
                                ${consumos.length > 0 ? consumos.map(c => `
                                    <tr>
                                        <td>${c.maquina_nombre}</td>
                                        <td>${new Date(c.fecha).toLocaleDateString()}</td>
                                        <td>${c.cantidad_kg}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="3" class="text-center">Sin consumos registrados</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- MUESTRAS -->
                <div class="card m-0">
                    <div class="card-header font-md">CONTROL DE CALIDAD</div>
                    <div class="table-container max-h-200">
                        <table class="table font-sm">
                            <thead><tr><th>Parámetro</th><th>Valor</th><th>Res</th></tr></thead>
                            <tbody>
                                ${muestras.length > 0 ? muestras.map(m => `
                                    <tr>
                                        <td>${m.parametro}</td>
                                        <td>${m.valor}</td>
                                        <td><span class="badge ${m.resultado === 'Cumple' ? 'badge-success' : 'badge-error'} badge-xs">${m.resultado}</span></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="3" class="text-center">Sin muestras</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card m-0">
                <div class="card-header">HISTORIAL DE ESTADOS</div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Usuario</th>
                                <th>Transición</th>
                                <th>Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historial_estados.length > 0 ? historial_estados.map(h => `
                                <tr>
                                    <td class="font-sm text-muted">${new Date(h.fecha).toLocaleString()}</td>
                                    <td>${h.usuario}</td>
                                    <td>
                                        <span class="badge badge-outline">${h.estado_anterior}</span>
                                        <i data-lucide="arrow-right" class="icon-xs v-middle"></i>
                                        <span class="badge badge-info">${h.estado_nuevo}</span>
                                    </td>
                                    <td class="font-md">${h.comentario || '-'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="text-center">No hay cambios de estado registrados</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        flowContainer.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    searchBtn.addEventListener('click', async () => {
        const val = searchInput.value.trim();
        if (!val) return;

        flowContainer.innerHTML = '<div class="text-center p-4">Buscando...</div>';

        try {
            let id;
            if (/^\d+$/.test(val)) {
                id = val;
            } else {
                id = await resolverIdPorCodigo(val);
            }
            await buscarTrazabilidad(id);
        } catch (error) {
            flowContainer.innerHTML = `<div class="badge badge-error w-100 text-center p-2">${error.message}</div>`;
        }
    });

    // Soporte para URL param ?lote_id=X
    const urlParams = new URLSearchParams(window.location.search);
    const preLoteId = urlParams.get('lote_id');
    if (preLoteId) {
        searchInput.value = preLoteId;
        buscarTrazabilidad(preLoteId);
    }
});
