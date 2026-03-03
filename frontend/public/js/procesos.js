/**
 * Gestión de la vista de Procesos Industriales
 * Proporciona una interfaz de solo lectura para la definición de procesos.
 */

// Definir closeModal en el ámbito global inmediatamente
window.closeModal = () => {
    const modal = document.getElementById('modal-proceso');
    if (modal) modal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('procesos-grid');
    const modal = document.getElementById('modal-proceso');

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Asegurar que los botones de cierre funcionen mediante event listeners además del onclick
    if (modal) {
        const closeBtns = modal.querySelectorAll('.btn-close, .modal-footer .btn-secondary');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                closeModal();
            });
        });
    }

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
        if (!grid) return;
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
                    <p><strong>Tipo de Proceso:</strong> ${p.tipoProceso || 'No definido'}</p>
                    <p><strong>Unidad de Medida:</strong> ${p.unidadProduccion}</p>
                </div>
                <div class="card-footer" style="text-align: right; border-top: 1px solid var(--border);">
                    <button class="btn btn-primary btn-sm" id="btn-detalle-${index}">
                        <i data-lucide="scroll-text" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i>
                        Ver Contrato Técnico
                    </button>
                </div>
            `;
            grid.appendChild(card);
            document.getElementById(`btn-detalle-${index}`).addEventListener('click', () => verDetalle(p));
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    window.verDetalle = (p) => {
        const titulo = document.getElementById('modal-proceso-titulo');
        const body = document.getElementById('modal-proceso-body');

        titulo.innerHTML = `<i data-lucide="shield-check" style="width: 24px; height: 24px; margin-right: 12px; color: var(--primary);"></i> Contrato Técnico: ${p.nombre}`;

        body.innerHTML = `
            <!-- 1️⃣ Descripción del proceso -->
            <div class="card p-3 mb-4" style="background: rgba(var(--primary-rgb), 0.02); border-left: 4px solid var(--primary);">
                <h4 class="mb-2" style="font-size: 0.9rem; text-transform: uppercase; color: var(--primary);">1. Descripción del Proceso</h4>
                <div style="font-size: 0.95rem;">
                    <p><strong>¿Qué hace?:</strong> ${p.descripcionProceso?.queHace || 'N/A'}</p>
                    <p><strong>¿Qué transforma?:</strong> ${p.descripcionProceso?.queTransforma || 'N/A'}</p>
                    <p><strong>¿Qué recibe?:</strong> ${p.descripcionProceso?.queRecibe || 'N/A'}</p>
                    <p><strong>¿Qué entrega?:</strong> ${p.descripcionProceso?.queEntrega || 'N/A'}</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- 2️⃣ Tipo de proceso -->
                <div class="card p-3 mb-4">
                    <h4 class="mb-2" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted);">2. Tipo de Proceso</h4>
                    <span class="badge badge-info" style="font-size: 1rem; padding: 8px 16px;">${p.tipoProceso || 'No definido'}</span>
                </div>

                <!-- 6️⃣ Unidades de reporte -->
                <div class="card p-3 mb-4">
                    <h4 class="mb-2" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted);">6. Unidades de Reporte</h4>
                    <p><strong>Producción:</strong> ${p.unidadesReporte?.produccion || p.unidadProduccion}</p>
                    <p><strong>Merma:</strong> ${p.unidadesReporte?.merma || 'kg'}</p>
                    <p><strong>Multi-unidad:</strong> ${p.unidadesReporte?.reporteMultiUnidad ? 'Sí' : 'No'}</p>
                </div>
            </div>

            <!-- 3️⃣ Parámetros operativos -->
            <div class="mt-2">
                <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">3. Parámetros Operativos (Monitoreo)</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${p.parametrosInformativos?.map(param => `
                        <span class="badge" style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 6px 12px;">
                            ${param.etiqueta} ${param.unidad ? `(${param.unidad})` : ''}
                        </span>
                    `).join('') || '<span class="text-muted">No definidos</span>'}
                </div>
            </div>

            <!-- 4️⃣ Medidas nominales y tolerancias de calidad -->
            <div class="mt-4">
                <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">4. Medidas Nominales y Tolerancias</h4>
                <div class="table-container">
                    <table class="table table-sm">
                        <thead style="background: var(--bg-secondary);">
                            <tr>
                                <th>Parámetro</th>
                                <th>Nominal</th>
                                <th>Tolerancia / Rango</th>
                                <th>Metodología</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${p.parametrosCalidad?.map(c => `
                                <tr>
                                    <td><strong>${c.etiqueta}</strong></td>
                                    <td>${c.nominal || 'Ver Orden'}</td>
                                    <td>
                                        ${c.tolerancia ? `±${c.tolerancia}` : ''}
                                        ${c.minimo !== undefined ? `[${c.minimo} - ${c.maximo}]` : ''}
                                        ${!c.tolerancia && c.minimo === undefined ? 'Referencial' : ''}
                                    </td>
                                    <td style="font-size: 0.8rem; max-width: 250px; white-space: normal;">${c.metodologia || ''}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="text-center py-3">No hay parámetros de calidad definidos</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;" class="mt-4">
                <!-- 5️⃣ Metas de producción -->
                <div class="card p-3">
                    <h4 class="mb-2" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted);">5. Metas de Producción (Ref)</h4>
                    <p style="font-size: 1.2rem; font-weight: bold; color: var(--success);">${p.metasProduccion?.metaEstandarTurno || 'No definida'} ${p.unidadProduccion} / Turno</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px;"><strong>Supuestos:</strong> ${p.metasProduccion?.supuestosOperativos || 'N/A'}</p>
                </div>

                <!-- 8️⃣ Personal operativo requerido -->
                <div class="card p-3">
                    <h4 class="mb-2" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted);">8. Personal Operativo</h4>
                    <p><strong>Min:</strong> ${p.personalOperativo?.minimo || 1} | <strong>Max:</strong> ${p.personalOperativo?.maximo || 2}</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px;"><strong>Reglas:</strong> ${p.personalOperativo?.reglasEspeciales || 'N/A'}</p>
                </div>
            </div>

            <!-- 7️⃣ Catálogo de paros -->
            <div class="mt-4">
                <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">7. Catálogo de Paros (Vocabulario)</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="font-size: 0.85rem;">
                        <strong style="color: var(--error);">Operativos/Mecánicos:</strong>
                        <ul style="margin: 4px 0; padding-left: 20px;">
                            ${[...(p.catalogoParos?.operativos || []), ...(p.catalogoParos?.mecanicos || [])].slice(0, 6).map(paro => `<li>${paro}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="font-size: 0.85rem;">
                        <strong style="color: var(--warning);">Calidad/Externos:</strong>
                        <ul style="margin: 4px 0; padding-left: 20px;">
                            ${[...(p.catalogoParos?.calidad || []), ...(p.catalogoParos?.externos || [])].slice(0, 6).map(paro => `<li>${paro}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <!-- 9️⃣ Impacto de variabilidad -->
            <div class="mt-4">
                <h4 class="mb-3" style="font-size: 0.9rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 4px;">9. Impacto de Variabilidad</h4>
                <div class="table-container">
                    <table class="table table-sm" style="font-size: 0.85rem;">
                        <tbody>
                            ${p.impactoVariabilidad?.map(v => `
                                <tr>
                                    <td style="width: 40%;"><strong>${v.condicion}</strong></td>
                                    <td>${v.impacto}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="2" class="text-center">No declarado</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Información Técnica Adicional -->
            <div class="mt-4" style="background: var(--bg-secondary); padding: 15px; border-radius: 8px; font-size: 0.85rem;">
                <h4 class="mb-2" style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Especificaciones Técnicas de Sistema</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><strong>Máquinas:</strong> ${p.maquinasPermitidas?.join(', ') || 'Ninguna'}</div>
                    <div><strong>Versión:</strong> ${p.version}</div>
                    <div><strong>Responsable:</strong> ${p.responsable}</div>
                    <div><strong>Último cambio:</strong> ${p.motivo}</div>
                </div>
            </div>
        `;

        if (modal) modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    };
});
