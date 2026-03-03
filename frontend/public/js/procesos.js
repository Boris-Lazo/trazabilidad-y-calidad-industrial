/**
 * Gestión de la vista de Procesos Industriales
 * Proporciona una interfaz de solo lectura para la definición de procesos.
 */

// Definir closeModal en el ámbito global inmediatamente
window.closeModal = () => {
    const modal = document.getElementById('modal-proceso');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restaurar scroll
    }
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
            if (grid) grid.innerHTML = `<div class="alert alert-error">Error al cargar procesos: ${result.error}</div>`;
        }
    } catch (error) {
        console.error('Error fetching processes:', error);
        if (grid) grid.innerHTML = `<div class="alert alert-error">Error de conexión con el servidor.</div>`;
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
        const modalContent = document.querySelector('#modal-proceso .modal-content');

        if (!titulo || !body) return;

        // Asegurar fondo opaco y scroll interno si es necesario
        if (modalContent) {
            modalContent.style.background = 'var(--bg-primary, #ffffff)';
            modalContent.style.color = 'var(--text-primary, #1a1a1a)';
            modalContent.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
            modalContent.style.maxHeight = '90vh';
            modalContent.style.overflowY = 'auto';
        }

        titulo.innerHTML = `<i data-lucide="shield-check" style="width: 24px; height: 24px; margin-right: 12px; color: var(--primary);"></i> Contrato Técnico: ${p.nombre}`;

        body.innerHTML = `
            <div class="contract-container" style="display: flex; flex-direction: column; gap: 24px; background: inherit;">

                <!-- 1. Descripción del proceso -->
                <section class="contract-section">
                    <h4 style="color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 4px; margin-bottom: 12px; font-size: 1rem; text-transform: uppercase;">1. Descripción del Proceso</h4>
                    <div class="card p-3" style="background: rgba(var(--primary-rgb), 0.02);">
                        <p><strong>Operativa:</strong> ${p.descripcionProceso?.queHace || 'No definida'}</p>
                        <p><strong>Transformación:</strong> ${p.descripcionProceso?.queTransforma || 'No definida'}</p>
                        <p><strong>Entrada:</strong> ${p.descripcionProceso?.queRecibe || 'No definida'}</p>
                        <p><strong>Salida:</strong> ${p.descripcionProceso?.queEntrega || 'No definida'}</p>
                    </div>
                </section>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <!-- 2. Metas de producción -->
                    <section class="contract-section">
                        <h4 style="color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 4px; margin-bottom: 12px; font-size: 1rem; text-transform: uppercase;">2. Metas de Producción</h4>
                        <div class="card p-3 h-100">
                            <p style="font-size: 1.25rem; font-weight: bold; color: var(--success); margin-bottom: 8px;">
                                ${p.metasProduccion?.metaEstandarTurno || 'N/A'} ${p.unidadesReporte?.produccion || p.unidadProduccion} / Turno
                            </p>
                            <p style="font-size: 0.9rem;"><strong>Condiciones:</strong> ${p.metasProduccion?.supuestosOperativos || 'Estándar'}</p>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">
                                <i data-lucide="trending-down" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>
                                <strong>Impacto eficiencia:</strong> ${p.metasProduccion?.condicionesReduccionEficiencia || 'N/A'}
                            </p>
                        </div>
                    </section>

                    <!-- 3. Personal requerido -->
                    <section class="contract-section">
                        <h4 style="color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 4px; margin-bottom: 12px; font-size: 1rem; text-transform: uppercase;">3. Personal Requerido</h4>
                        <div class="card p-3 h-100">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                <div style="background: var(--bg-secondary); padding: 8px 16px; border-radius: 8px; text-align: center;">
                                    <span style="display: block; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted);">Mínimo</span>
                                    <strong style="font-size: 1.2rem;">${p.personalOperativo?.minimo || 1}</strong>
                                </div>
                                <div style="background: var(--bg-secondary); padding: 8px 16px; border-radius: 8px; text-align: center;">
                                    <span style="display: block; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted);">Máximo</span>
                                    <strong style="font-size: 1.2rem;">${p.personalOperativo?.maximo || '-'}</strong>
                                </div>
                            </div>
                            <p style="font-size: 0.9rem;"><strong>Reglas:</strong> ${p.personalOperativo?.reglasEspeciales || 'Sin reglas especiales'}</p>
                        </div>
                    </section>
                </div>

                <!-- 4. Parámetros de calidad -->
                <section class="contract-section">
                    <h4 style="color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 4px; margin-bottom: 12px; font-size: 1rem; text-transform: uppercase;">4. Parámetros de Calidad</h4>
                    <div class="table-container">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Parámetro</th>
                                    <th>Nominal</th>
                                    <th>Tolerancia / Rango</th>
                                    <th>Metodología / Por qué</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.parametrosCalidad?.map(c => `
                                    <tr>
                                        <td><strong>${c.etiqueta}</strong></td>
                                        <td>${c.nominal || 'Ver Orden'} ${c.unidad || ''}</td>
                                        <td>
                                            ${c.tolerancia ? `±${c.tolerancia} ${c.unidad || ''}` : ''}
                                            ${c.minimo !== undefined ? `[${c.minimo} - ${c.maximo}] ${c.unidad || ''}` : ''}
                                            ${!c.tolerancia && c.minimo === undefined ? 'Referencial' : ''}
                                        </td>
                                        <td style="font-size: 0.85rem;">${c.metodologia || 'Inspección estándar'}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" class="text-center">No definidos</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- 5. Parámetros operativos (Monitoreo) -->
                <section class="contract-section">
                    <h4 style="color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 4px; margin-bottom: 12px; font-size: 1rem; text-transform: uppercase;">5. Parámetros Operativos</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                        ${p.parametrosInformativos?.map(param => `
                            <div style="background: var(--bg-secondary); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.85rem; font-weight: 500;">${param.etiqueta}</span>
                                <span class="badge" style="background: var(--bg-primary); color: var(--primary);">${param.unidad || '-'}</span>
                            </div>
                        `).join('') || '<p class="text-muted">No hay variables de monitoreo definidas</p>'}
                    </div>
                </section>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                    <!-- 6. Catálogo de paros -->
                    <section class="contract-section">
                        <h4 style="color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 4px; margin-bottom: 12px; font-size: 1rem; text-transform: uppercase;">6. Catálogo de Paros</h4>
                        <div class="card p-3">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <strong style="color: var(--error); font-size: 0.8rem; text-transform: uppercase;">Operativos / Mecánicos</strong>
                                    <ul style="margin: 8px 0; padding-left: 18px; font-size: 0.85rem; line-height: 1.4;">
                                        ${[...(p.catalogoParos?.operativos || []), ...(p.catalogoParos?.mecanicos || [])].slice(0, 8).map(paro => `<li>${paro}</li>`).join('') || '<li>N/A</li>'}
                                    </ul>
                                </div>
                                <div>
                                    <strong style="color: var(--warning); font-size: 0.8rem; text-transform: uppercase;">Calidad / Externos</strong>
                                    <ul style="margin: 8px 0; padding-left: 18px; font-size: 0.85rem; line-height: 1.4;">
                                        ${[...(p.catalogoParos?.calidad || []), ...(p.catalogoParos?.externos || [])].slice(0, 8).map(paro => `<li>${paro}</li>`).join('') || '<li>N/A</li>'}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 7. Unidades de reporte -->
                    <section class="contract-section">
                        <h4 style="color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 4px; margin-bottom: 12px; font-size: 1rem; text-transform: uppercase;">7. Unidades de Reporte</h4>
                        <div class="card p-3">
                            <div class="mb-2">
                                <span style="font-size: 0.75rem; color: var(--text-muted); display: block; text-transform: uppercase;">Producción</span>
                                <strong>${p.unidadesReporte?.produccion || p.unidadProduccion}</strong>
                            </div>
                            <div class="mb-2">
                                <span style="font-size: 0.75rem; color: var(--text-muted); display: block; text-transform: uppercase;">Merma</span>
                                <strong>${p.unidadesReporte?.merma || 'kg'}</strong>
                            </div>
                            <div>
                                <span style="font-size: 0.75rem; color: var(--text-muted); display: block; text-transform: uppercase;">Rechazo</span>
                                <strong>${p.unidadesReporte?.rechazo || 'No aplica'}</strong>
                            </div>
                        </div>
                    </section>
                </div>

            </div>
        `;

        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Evitar scroll en fondo
        }
        if (window.lucide) window.lucide.createIcons();
    };
});
