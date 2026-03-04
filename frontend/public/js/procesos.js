/**
 * Gestión de la vista de Procesos Industriales
 * Proporciona una interfaz de solo lectura para la definición de procesos.
 */

// Definir closeModal en el ámbito global inmediatamente
window.closeModal = () => {
    const modal = document.getElementById('modal-proceso');
    if (modal) {
        modal.classList.remove('d-flex');
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
                <div class="card-header d-flex justify-between align-center bg-black-005">
                    <span class="text-bold font-lg">${p.nombre}</span>
                    <span class="badge badge-info">ID: ${p.processId}</span>
                </div>
                <div class="card-body">
                    <div class="grid-2 mb-2">
                        <div>
                            <span class="font-sm text-muted block">Área</span>
                            <strong>${p.area}</strong>
                        </div>
                        <div>
                            <span class="font-sm text-muted block">Versión</span>
                            <strong>${p.version}</strong>
                        </div>
                    </div>
                    <p><strong>Tipo de Proceso:</strong> ${p.tipoProceso || 'No definido'}</p>
                    <p><strong>Unidad de Medida:</strong> ${p.unidadProduccion}</p>
                </div>
                <div class="card-footer text-right border-top">
                    <button class="btn btn-primary btn-sm" id="btn-detalle-${index}">
                        <i data-lucide="scroll-text" class="icon-xs v-middle mr-1"></i>
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

        // Limpiar estilos inline
        if (modalContent) {
            modalContent.classList.add('scroll-y');
        }

        titulo.innerHTML = `<i data-lucide="shield-check" class="icon-lg mr-1 text-primary"></i> Contrato Técnico: ${p.nombre}`;

        body.innerHTML = `
            <div class="contract-container">

                <!-- 1. Descripción del proceso -->
                <section class="contract-section">
                    <h4 class="contract-section-title">1. Descripción del Proceso</h4>
                    <div class="card p-3 contract-highlight-card">
                        <p><strong>Operativa:</strong> ${p.descripcionProceso?.queHace || 'No definida'}</p>
                        <p><strong>Transformación:</strong> ${p.descripcionProceso?.queTransforma || 'No definida'}</p>
                        <p><strong>Entrada:</strong> ${p.descripcionProceso?.queRecibe || 'No definida'}</p>
                        <p><strong>Salida:</strong> ${p.descripcionProceso?.queEntrega || 'No definida'}</p>
                    </div>
                </section>

                <div class="grid-2">
                    <!-- 2. Metas de producción -->
                    <section class="contract-section">
                        <h4 class="contract-section-title">2. Metas de Producción</h4>
                        <div class="card p-3 h-100">
                            <p class="contract-meta-value">
                                ${p.metasProduccion?.metaEstandarTurno || 'N/A'} ${p.unidadesReporte?.produccion || p.unidadProduccion} / Turno
                            </p>
                            <p class="font-md"><strong>Condiciones:</strong> ${p.metasProduccion?.supuestosOperativos || 'Estándar'}</p>
                            <p class="font-sm text-muted mt-1">
                                <i data-lucide="trending-down" class="icon-xs v-middle mr-1"></i>
                                <strong>Impacto eficiencia:</strong> ${p.metasProduccion?.condicionesReduccionEficiencia || 'N/A'}
                            </p>
                        </div>
                    </section>

                    <!-- 3. Personal requerido -->
                    <section class="contract-section">
                        <h4 class="contract-section-title">3. Personal Requerido</h4>
                        <div class="card p-3 h-100">
                            <div class="d-flex align-center gap-2 mb-2">
                                <div class="contract-personal-box">
                                    <span class="block font-xs uppercase text-muted">Mínimo</span>
                                    <strong class="font-lg">${p.personalOperativo?.minimo || 1}</strong>
                                </div>
                                <div class="contract-personal-box">
                                    <span class="block font-xs uppercase text-muted">Máximo</span>
                                    <strong class="font-lg">${p.personalOperativo?.maximo || '-'}</strong>
                                </div>
                            </div>
                            <p class="font-md"><strong>Reglas:</strong> ${p.personalOperativo?.reglasEspeciales || 'Sin reglas especiales'}</p>
                        </div>
                    </section>
                </div>

                <!-- 4. Parámetros de calidad -->
                <section class="contract-section">
                    <h4 class="contract-section-title">4. Parámetros de Calidad</h4>
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
                                        <td class="font-sm">${c.metodologia || 'Inspección estándar'}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" class="text-center">No definidos</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- 5. Parámetros operativos (Monitoreo) -->
                <section class="contract-section">
                    <h4 class="contract-section-title">5. Parámetros Operativos</h4>
                    <div class="contract-param-grid">
                        ${p.parametrosInformativos?.map(param => `
                            <div class="contract-param-item">
                                <span class="font-sm text-bold">${param.etiqueta}</span>
                                <span class="badge bg-light text-primary">${param.unidad || '-'}</span>
                            </div>
                        `).join('') || '<p class="text-muted">No hay variables de monitoreo definidas</p>'}
                    </div>
                </section>

                <div class="grid-1-2">
                    <!-- 6. Catálogo de paros -->
                    <section class="contract-section col-span-2">
                        <h4 class="contract-section-title">6. Catálogo de Paros</h4>
                        <div class="card p-3">
                            <div class="grid-2">
                                <div>
                                    <strong class="contract-paro-type-oper font-xs uppercase">Operativos / Mecánicos</strong>
                                    <ul class="contract-paros-list">
                                        ${[...(p.catalogoParos?.operativos || []), ...(p.catalogoParos?.mecanicos || [])].slice(0, 8).map(paro => `<li>${paro}</li>`).join('') || '<li>N/A</li>'}
                                    </ul>
                                </div>
                                <div>
                                    <strong class="contract-paro-type-qual font-xs uppercase">Calidad / Externos</strong>
                                    <ul class="contract-paros-list">
                                        ${[...(p.catalogoParos?.calidad || []), ...(p.catalogoParos?.externos || [])].slice(0, 8).map(paro => `<li>${paro}</li>`).join('') || '<li>N/A</li>'}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 7. Unidades de reporte -->
                    <section class="contract-section">
                        <h4 class="contract-section-title">7. Unidades de Reporte</h4>
                        <div class="card p-3">
                            <div class="mb-2">
                                <span class="block font-xs text-muted uppercase">Producción</span>
                                <strong>${p.unidadesReporte?.produccion || p.unidadProduccion}</strong>
                            </div>
                            <div class="mb-2">
                                <span class="block font-xs text-muted uppercase">Merma</span>
                                <strong>${p.unidadesReporte?.merma || 'kg'}</strong>
                            </div>
                            <div>
                                <span class="block font-xs text-muted uppercase">Rechazo</span>
                                <strong>${p.unidadesReporte?.rechazo || 'No aplica'}</strong>
                            </div>
                        </div>
                    </section>
                </div>

            </div>
        `;

        if (modal) {
            modal.classList.add('d-flex');
            document.body.style.overflow = 'hidden'; // Evitar scroll en fondo
        }
        if (window.lucide) window.lucide.createIcons();
    };
});
