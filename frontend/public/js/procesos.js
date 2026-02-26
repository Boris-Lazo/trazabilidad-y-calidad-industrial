/**
 * Gestión de la vista de Procesos Industriales
 * Proporciona una interfaz de solo lectura para la definición de procesos.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('procesos-grid');

    try {
        const response = await fetch('/api/procesos');
        const result = await response.json();

        if (result.success) {
            renderProcesos(result.data);
        } else {
            grid.innerHTML = `<div class="alert alert-error">Error al cargar procesos: ${result.error}</div>`;
        }
    } catch (error) {
        console.error('Error fetching processes:', error);
        grid.innerHTML = `<div class="alert alert-error">Error de conexión con el servidor.</div>`;
    }

    function renderProcesos(procesos) {
        grid.innerHTML = '';
        procesos.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.03);">
                    <span style="font-weight: bold; font-size: 1.1rem;">${p.nombre}</span>
                    <span class="badge badge-info">ID: ${p.processId}</span>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Área</span>
                            <strong>${p.area}</strong>
                        </div>
                        <div>
                            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Versión</span>
                            <strong>${p.version}</strong>
                        </div>
                    </div>
                    <p><strong>Unidad de Medida:</strong> ${p.unidadProduccion}</p>
                    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">
                        "${p.motivo}"
                    </p>
                </div>
                <div class="card-footer" style="text-align: right; border-top: 1px solid var(--border);">
                    <button class="btn btn-secondary btn-sm" id="btn-detalle-${index}">
                        <i data-lucide="scroll-text" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i>
                        Ver Contrato Técnico
                    </button>
                </div>
            `;
            grid.appendChild(card);
            document.getElementById(`btn-detalle-${index}`).addEventListener('click', () => verDetalle(p));
        });

        // Re-inicializar iconos de Lucide para los nuevos elementos
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    window.verDetalle = (p) => {
        const modal = document.getElementById('modal-proceso');
        const titulo = document.getElementById('modal-proceso-titulo');
        const body = document.getElementById('modal-proceso-body');

        titulo.innerHTML = `<i data-lucide="shield-check" style="width: 24px; height: 24px; margin-right: 12px; color: var(--primary);"></i> Contrato Técnico: ${p.nombre}`;

        body.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div class="card p-3" style="background: rgba(0,0,0,0.01);">
                    <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">Información General</h4>
                    <p style="margin-bottom: 8px;"><strong>Estado:</strong> <span class="badge badge-success">● ${p.estado}</span></p>
                    <p style="margin-bottom: 8px;"><strong>Fecha Creación:</strong> ${p.fechaCreacion}</p>
                    <p style="margin-bottom: 8px;"><strong>Responsable:</strong> ${p.responsable}</p>
                    <p style="margin-bottom: 8px;"><strong>Unidad de Producción:</strong> ${p.unidadProduccion}</p>
                </div>
                <div class="card p-3" style="background: rgba(0,0,0,0.01);">
                    <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">Tipos de Orden Admitidos</h4>
                    <ul style="padding-left: 20px; font-size: 0.95rem;">
                        ${p.tiposOrdenPermitidos.map(o => `<li style="margin-bottom: 4px;">${o}</li>`).join('') || '<li>No definido en contrato</li>'}
                    </ul>
                </div>
            </div>

            <div class="mt-4">
                <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">Recursos Físicos (Máquinas Autorizadas)</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${p.maquinasPermitidas.map(m => `<span class="badge badge-info" style="color: white; padding: 4px 12px;">${m}</span>`).join('') || '<span class="text-muted">No hay máquinas vinculadas en el contrato técnico</span>'}
                </div>
            </div>

            <div class="mt-4">
                <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">Métricas Obligatorias de Planta</h4>
                <div class="table-container">
                    <table class="table table-sm">
                        <thead style="background: var(--bg-secondary);">
                            <tr>
                                <th>Nombre del Parámetro</th>
                                <th>Unidad de Medida</th>
                                <th>Impacto en Trazabilidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${p.metricasObligatorias.map(m => `
                                <tr>
                                    <td><strong>${m.nombre}</strong></td>
                                    <td>${m.unidad}</td>
                                    <td><span class="text-success" style="font-size: 0.8rem; font-weight: 600;">CRÍTICO / OBLIGATORIO</span></td>
                                </tr>
                            `).join('') || '<tr><td colspan="3" class="text-center py-3">Ninguna métrica técnica definida en el contrato actual</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="mt-4">
                <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">Roles Operativos Autorizados</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${p.rolesOperativosPermitidos.map(r => `<span class="badge" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border);">${r}</span>`).join('')}
                </div>
            </div>

            <div class="mt-4">
                <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">Historial de Versiones e Integridad</h4>
                <div class="table-container">
                    <table class="table table-sm" style="font-size: 0.85rem;">
                        <thead>
                            <tr>
                                <th>Versión</th>
                                <th>Fecha</th>
                                <th>Motivo del Cambio</th>
                                <th>Responsable</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${p.historial.map(h => `
                                <tr>
                                    <td><span class="badge badge-info">${h.version}</span></td>
                                    <td>${h.fecha}</td>
                                    <td style="max-width: 300px; white-space: normal;">${h.motivo}</td>
                                    <td>${h.responsable}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeModal = () => {
        document.getElementById('modal-proceso').style.display = 'none';
    };

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modal-proceso');
        if (event.target === modal) {
            closeModal();
        }
    });
});
