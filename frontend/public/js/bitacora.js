document.addEventListener('DOMContentLoaded', () => {
    const viewApertura = document.getElementById('view-apertura');
    const viewAbierta = document.getElementById('view-abierta');
    const formAbrir = document.getElementById('form-abrir-bitacora');
    const gridProcesos = document.getElementById('grid-procesos');
    const btnCerrar = document.getElementById('btn-cerrar-bitacora');
    const modalCierre = document.getElementById('modal-cierre');
    const checklistProcesos = document.getElementById('checklist-procesos');
    const containerRevision = document.getElementById('container-revision');
    const obsRevision = document.getElementById('obs-revision');
    const confirmarCierre = document.getElementById('confirmar-cierre');
    const cancelarCierre = document.getElementById('cancelar-cierre');

    let currentBitacora = null;
    let procesosTurno = [];

    // --- RELOJ Y TIEMPO REAL ---
    async function updateClock() {
        try {
            const response = await fetch('/api/bitacora/tiempo-actual');
            const result = await response.json();
            const data = result.data || {};

            document.getElementById('reloj-fecha').textContent = data.fecha;
            document.getElementById('reloj-hora').textContent = data.hora;
        } catch (error) {
            console.error('Error al actualizar el reloj:', error);
        }
    }

    setInterval(updateClock, 60000);
    updateClock();

    // --- ESTADO Y CARGA ---
    async function checkEstado() {
        try {
            const response = await fetch('/api/bitacora/estado');
            const result = await response.json();
            const data = result.data || {};

            if (data.abierta) {
                currentBitacora = data.bitacora;
                procesosTurno = data.procesos;
                showAbierta(data);
            } else {
                showApertura();
            }
        } catch (error) {
            console.error('Error al consultar estado:', error);
        }
    }

    async function showApertura() {
        viewApertura.style.display = 'block';
        viewAbierta.style.display = 'none';
        document.getElementById('header-contexto').style.display = 'none';

        const user = Auth.getUser();
        if (user) {
            document.getElementById('inspector').value = user.nombre || user.username;
        }
    }

    function showAbierta(data) {
        viewApertura.style.display = 'none';
        viewAbierta.style.display = 'block';
        document.getElementById('header-contexto').style.display = 'flex';

        const b = data.bitacora;
        document.getElementById('info-turno').textContent = b.turno;
        document.getElementById('info-fecha').textContent = b.fecha_operativa;
        document.getElementById('info-inspector').textContent = b.inspector;
        document.getElementById('info-estado').textContent = b.estado;

        if (b.fuera_de_horario) {
            document.getElementById('warning-horario').style.display = 'block';
        }

        gridProcesos.innerHTML = '';
        data.procesos.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card process-card';
            card.style.borderLeft = `8px solid ${getEstadoColor(p.estadoUI)}`;
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';

            const isBlocked = p.bloqueos && p.bloqueos.length > 0;

            const canAction = p.accionesPermitidas && p.accionesPermitidas.length > 0;
            const isMandatory = data.siguienteAccion === 'IR_A_PROCESO' && data.actionPayload?.proceso_id == p.id;

            card.innerHTML = `
                <div style="padding: 1rem;">
                    <h3 style="margin-bottom: 0.5rem; font-size: 1.1rem;">${p.nombre}</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="badge ${getBadgeClass(p.estadoUI)}">${p.estadoUI}</span>
                        <small style="color: var(--text-secondary);">${p.ultimaActualizacion}</small>
                    </div>
                    ${isBlocked ? `
                        <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--danger); font-weight: bold;">
                            <i data-lucide="lock" style="width: 10px; height: 10px; vertical-align: middle;"></i>
                            ${p.bloqueos[0]}
                        </div>
                    ` : ''}
                </div>
                <div style="background: rgba(0,0,0,0.05); padding: 0.75rem 1rem; text-align: right;">
                    <button class="btn ${isMandatory ? 'btn-primary' : 'btn-secondary'} btn-registrar"
                            data-id="${p.id}" data-nombre="${p.nombre}" style="min-width: 120px;"
                            ${!canAction ? 'disabled' : ''}>
                        ${b.estado === 'CERRADA' ? 'Ver Histórico' : (isMandatory ? 'REGISTRO OBLIGATORIO' : (() => {
                            const labels = {
                                'REGISTRAR':        'Registrar',
                                'COMPLETAR_DATOS':  'Completar datos',
                                'REVISAR':          'Revisar desviación',
                                'NINGUNA':          'Ver detalle',
                                'REGISTRAR_CALIDAD':'Registrar calidad',
                                'REGISTRAR_PRODUCCION': 'Registrar producción',
                            };
                            return labels[p.siguienteAccion] || p.siguienteAccion;
                        })())}
                    </button>
                </div>
            `;
            gridProcesos.appendChild(card);
        });

        // ── Tarjeta especial: Tareas Generales (proceso 99) ─────────────
        if (b.estado !== 'CERRADA') {
            const cardTG = document.createElement('div');
            cardTG.className = 'card process-card';
            cardTG.style.cssText = 'border-left:8px solid #6366f1; display:flex; flex-direction:column; justify-content:space-between;';
            cardTG.innerHTML = `
                <div style="padding:1rem;">
                    <h3 style="margin-bottom:0.5rem; font-size:1.1rem;">Tareas Generales</h3>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span id="badge-tareas-generales" class="badge badge-secondary">Sin registros</span>
                        <small style="color:var(--text-secondary); font-size:0.75rem;">Limpieza · Reproceso · Recuperación</small>
                    </div>
                </div>
                <div style="background:rgba(0,0,0,0.05); padding:0.75rem 1rem; text-align:right;">
                    <button class="btn btn-secondary" id="btn-abrir-tareas-generales" style="min-width:120px;">
                        Registrar Tarea
                    </button>
                </div>
            `;
            gridProcesos.appendChild(cardTG);
            document.getElementById('btn-abrir-tareas-generales').addEventListener('click', () => {
                abrirModalTareasGenerales();
            });
            cargarResumenTareasGenerales();
        }

        // Lógica de habilitación de cierre
        btnCerrar.disabled = data.estadoTurno !== 'LISTO_PARA_CIERRE' || b.estado === 'CERRADA';
        btnCerrar.style.display = b.estado === 'CERRADA' ? 'none' : 'block';

        if (b.estado === 'CERRADA') {
            // Ceremonial histórico: Cambiar visual completa
            document.body.classList.add('historical-mode');
            const mainContainer = document.querySelector('.main-container');
            mainContainer.style.filter = 'grayscale(0.5)';
            mainContainer.style.pointerEvents = 'none';
            document.querySelector('.sidebar').style.filter = 'grayscale(0.5)';

            const alertCerrada = document.createElement('div');
            alertCerrada.className = 'card';
            alertCerrada.style.background = '#1f2937'; // Slate 800
            alertCerrada.style.color = 'white';
            alertCerrada.style.marginBottom = '2rem';
            alertCerrada.style.textAlign = 'center';
            alertCerrada.style.padding = '2rem';
            alertCerrada.style.border = '4px solid #ef4444';
            alertCerrada.innerHTML = `
                <i data-lucide="lock" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                <h1 style="margin:0; font-size: 2rem;">BITÁCORA CERRADA E INMUTABLE</h1>
                <p>Este turno ha sido finalizado y auditado. No se permiten más cambios.</p>
            `;
            viewAbierta.prepend(alertCerrada);
        }

        // Listeners a botones de tarjetas
        document.querySelectorAll('.btn-registrar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const nombre = e.target.getAttribute('data-nombre');
                if (nombre === 'Telares') {
                    window.location.href = `/telares_resumen.html?id=${currentBitacora.id}`;
                } else {
                    window.location.href = `/proceso.html?id=${id}&nombre=${encodeURIComponent(nombre)}`;
                }
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function getEstadoColor(estado) {
        if (!estado) return 'var(--border-color)';
        if (estado.includes('Sin datos')) return 'var(--text-secondary)';
        if (estado.includes('Esperando')) return 'var(--warning)';
        if (estado.includes('Parcial')) return 'var(--warning)';
        if (estado.includes('Completo')) return 'var(--success)';
        if (estado.includes('Revisión')) return 'var(--danger)';
        return 'var(--border-color)';
    }

    function getBadgeClass(estado) {
        if (!estado) return '';
        if (estado.includes('Sin datos')) return 'badge-outline';
        if (estado.includes('Esperando')) return 'badge-warning';
        if (estado.includes('Parcial')) return 'badge-warning';
        if (estado.includes('Completo')) return 'badge-success';
        if (estado.includes('Revisión')) return 'badge-error';
        return '';
    }

    // --- APERTURA ---
    formAbrir.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/bitacora/abrir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ })
            });

            if (response.ok) {
                checkEstado();
            } else {
                const result = await response.json();
                DesignSystem.showErrorModal('Error al Abrir', result.error || 'No se pudo abrir la bitácora de turno.');
            }
        } catch (error) {
            console.error('Error al abrir:', error);
        }
    });

    // --- CIERRE (EVENTO IRREVERSIBLE) ---
    btnCerrar.addEventListener('click', async () => {
        if (btnCerrar.disabled) return;

        // Obtener estado completo para el resumen
        const res = await fetch('/api/bitacora/estado');
        const state = (await res.json()).data;
        const resumenCierre = state.resumenCierre || [];

        document.getElementById('modal-turno-text').textContent = currentBitacora.turno;
        document.getElementById('modal-fecha-text').textContent = currentBitacora.fecha_operativa;

        const resumenContainer = document.getElementById('resumen-cierre-container');
        resumenContainer.innerHTML = resumenCierre.map(p => `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem;">
                <span>${p.nombre}:</span>
                <span style="font-weight: bold;">
                    ${p.produccion} ${p.unidad}
                    <i data-lucide="${p.calidadValidada ? 'shield-check' : 'shield-alert'}"
                       style="width: 14px; height: 14px; vertical-align: middle; color: ${p.calidadValidada ? 'var(--success)' : 'var(--danger)'};"></i>
                </span>
            </div>
        `).join('');

        checklistProcesos.innerHTML = '';
        let hasRevision = false;

        procesosTurno.forEach(p => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.padding = '0.5rem';
            item.style.borderBottom = '1px solid var(--border-color)';

            const labelColor = p.estado.includes('Completo') ? 'var(--success)' : 'var(--danger)';
            const icon = p.estado.includes('Completo') ? 'check-circle' : 'alert-circle';

            if (p.estado.includes('Revisión')) hasRevision = true;

            item.innerHTML = `
                <span><i data-lucide="${icon}" style="width: 14px; height: 14px; vertical-align: middle; color: ${labelColor}; margin-right: 8px;"></i> ${p.nombre}</span>
                <span style="font-weight: bold; color: ${labelColor}">${p.estado}</span>
            `;
            checklistProcesos.appendChild(item);
        });

        containerRevision.style.display = hasRevision ? 'block' : 'none';
        obsRevision.required = hasRevision;

        const checkFinal = document.getElementById('check-confirmacion-final');
        checkFinal.checked = false;
        confirmarCierre.disabled = true;

        checkFinal.onchange = (e) => {
            confirmarCierre.disabled = !e.target.checked;
        };

        modalCierre.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    });

    confirmarCierre.addEventListener('click', async () => {
        if (containerRevision.style.display === 'block' && !obsRevision.value.trim()) {
            DesignSystem.showErrorModal('Motivo Requerido', 'Por favor, ingrese el motivo de revisión de los procesos marcados.');
            obsRevision.focus();
            return;
        }

        try {
            const response = await fetch(`/api/bitacora/${currentBitacora.id}/cerrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observaciones: obsRevision.value })
            });

            if (response.ok) {
                modalCierre.style.display = 'none';
                obsRevision.value = '';
                checkEstado();
            } else {
                const res = await response.json();
                DesignSystem.showErrorModal('Error al Cerrar', 'No se pudo cerrar la bitácora: ' + (res.error || res.message));
            }
        } catch (error) {
            console.error('Error al cerrar:', error);
        }
    });

    cancelarCierre.onclick = () => { modalCierre.style.display = 'none'; };

    // ── Tareas Generales (proceso 99) ────────────────────────────────
    const TIPOS_TAREA = [
        'Limpieza de área', 'Limpieza de máquina',
        'Reprocesamiento de material', 'Recuperación de material',
        'Mantenimiento menor', 'Apoyo a otro proceso',
        'Orden y clasificación', 'Otro',
    ];

    async function cargarResumenTareasGenerales() {
        if (!currentBitacora) return;
        try {
            const res  = await fetch(`/api/tareas-generales?bitacora_id=${currentBitacora.id}`);
            const data = (await res.json()).data || {};
            const badge = document.getElementById('badge-tareas-generales');
            if (!badge) return;
            const n = (data.tareas || []).length;
            if (n === 0) {
                badge.textContent = 'Sin registros';
                badge.className   = 'badge badge-secondary';
            } else {
                const mins = data.total_minutos || 0;
                badge.textContent = `${n} tarea${n > 1 ? 's' : ''} · ${mins} min`;
                badge.className   = 'badge badge-success';
            }
        } catch (e) { console.warn('Error cargando tareas generales', e); }
    }

    function abrirModalTareasGenerales() {
        // Crear modal dinámicamente si no existe
        let modal = document.getElementById('modal-tareas-generales');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-tareas-generales';
            modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:1000; justify-content:center; align-items:flex-start; padding-top:3rem;';
            modal.innerHTML = `
                <div class="card" style="width:95%; max-width:640px; max-height:85vh; overflow-y:auto;">
                    <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <span><i data-lucide="clipboard-list" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i>Tareas Generales</span>
                        <button id="btn-cerrar-tg" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--text-secondary);">×</button>
                    </div>
                    <div style="padding:1.2rem;">

                        <!-- Formulario nueva tarea -->
                        <div style="background:var(--bg-alt); border:1px solid var(--border); border-radius:8px; padding:1rem; margin-bottom:1.2rem;">
                            <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:0.8rem;">Agregar Tarea</div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                                <div>
                                    <label style="font-size:0.78rem; font-weight:600; display:block; margin-bottom:3px;">Tipo de tarea *</label>
                                    <select id="tg-tipo" class="form-control" style="width:100%;">
                                        <option value="">— Seleccione —</option>
                                        ${TIPOS_TAREA.map(t => `<option value="${t}">${t}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label style="font-size:0.78rem; font-weight:600; display:block; margin-bottom:3px;">Área / Máquina</label>
                                    <input type="text" id="tg-area" class="form-control" placeholder="Ej: Área de telares, EXTPP01" style="width:100%;">
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns:120px 1fr; gap:10px; margin-bottom:10px;">
                                <div>
                                    <label style="font-size:0.78rem; font-weight:600; display:block; margin-bottom:3px;">Tiempo (min)</label>
                                    <input type="number" id="tg-tiempo" class="form-control" min="0" placeholder="0" style="width:100%;">
                                </div>
                                <div>
                                    <label style="font-size:0.78rem; font-weight:600; display:block; margin-bottom:3px;">Observaciones</label>
                                    <input type="text" id="tg-obs" class="form-control" placeholder="Detalle adicional..." style="width:100%;">
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <button id="btn-guardar-tg" class="btn btn-primary" style="font-size:0.85rem; padding:6px 16px;">
                                    + Agregar
                                </button>
                            </div>
                        </div>

                        <!-- Lista de tareas registradas -->
                        <div id="lista-tareas-generales">
                            <div style="text-align:center; color:var(--text-secondary); padding:1rem; font-size:0.9rem;">Cargando...</div>
                        </div>

                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('btn-cerrar-tg').onclick = () => {
                modal.style.display = 'none';
            };
            modal.addEventListener('click', e => {
                if (e.target === modal) modal.style.display = 'none';
            });
            document.getElementById('btn-guardar-tg').onclick = guardarTareaGeneral;
            if (window.lucide) window.lucide.createIcons();
        }

        modal.style.display = 'flex';
        renderListaTareasGenerales();
    }

    async function guardarTareaGeneral() {
        const tipo  = document.getElementById('tg-tipo')?.value;
        const area  = document.getElementById('tg-area')?.value;
        const tiempo = document.getElementById('tg-tiempo')?.value;
        const obs   = document.getElementById('tg-obs')?.value;

        if (!tipo) { DesignSystem.showToast('Selecciona el tipo de tarea.', 'warning'); return; }

        try {
            const res = await fetch('/api/tareas-generales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bitacora_id:   currentBitacora.id,
                    tipo_tarea:    tipo,
                    area_maquina:  area,
                    tiempo_minutos: parseInt(tiempo) || 0,
                    observaciones: obs,
                })
            });
            if (res.ok) {
                // Limpiar form
                document.getElementById('tg-tipo').value  = '';
                document.getElementById('tg-area').value  = '';
                document.getElementById('tg-tiempo').value = '';
                document.getElementById('tg-obs').value   = '';
                DesignSystem.showToast('Tarea registrada.', 'success');
                await renderListaTareasGenerales();
                await cargarResumenTareasGenerales();
            } else {
                const err = await res.json();
                DesignSystem.showToast(err.error || 'Error al guardar.', 'error');
            }
        } catch (e) {
            console.error(e);
            DesignSystem.showToast('Error de conexión.', 'error');
        }
    }

    async function renderListaTareasGenerales() {
        const container = document.getElementById('lista-tareas-generales');
        if (!container) return;
        try {
            const res  = await fetch(`/api/tareas-generales?bitacora_id=${currentBitacora.id}`);
            const data = (await res.json()).data || {};
            const tareas = data.tareas || [];

            if (tareas.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:1rem; font-size:0.9rem;">No hay tareas registradas aún.</div>';
                return;
            }

            const totalMins = data.total_minutos || 0;
            container.innerHTML = `
                <div style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:0.6rem;">
                    Registradas este turno — Total: ${totalMins} min
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${tareas.map(t => `
                        <div style="background:var(--bg-alt); border:1px solid var(--border); border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:600; font-size:0.88rem;">${t.tipo_tarea}</div>
                                <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:2px;">
                                    ${t.area_maquina ? `<span style="margin-right:8px;">📍 ${t.area_maquina}</span>` : ''}
                                    ${t.tiempo_minutos ? `<span style="margin-right:8px;">⏱ ${t.tiempo_minutos} min</span>` : ''}
                                    ${t.observaciones ? `<span>${t.observaciones}</span>` : ''}
                                </div>
                            </div>
                            <button onclick="eliminarTareaGeneral(${t.id})"
                                    style="background:none; border:none; cursor:pointer; color:var(--error); font-size:1.2rem; flex-shrink:0; padding:0 4px;"
                                    title="Eliminar">×</button>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            container.innerHTML = '<div style="color:var(--error);">Error al cargar tareas.</div>';
        }
    }

    window.eliminarTareaGeneral = async (id) => {
        try {
            const res = await fetch(`/api/tareas-generales/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await renderListaTareasGenerales();
                await cargarResumenTareasGenerales();
                DesignSystem.showToast('Tarea eliminada.', 'success');
            }
        } catch (e) { DesignSystem.showToast('Error al eliminar.', 'error'); }
    };

    checkEstado();
});