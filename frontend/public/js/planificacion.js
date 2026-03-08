document.addEventListener('DOMContentLoaded', async () => {
    let currentPlan  = null;
    let procesos     = [];
    let ordenes      = [];
    let personal     = [];
    let rolesOperativos = [];
    let maquinas     = [];
    let procesoActual = null;   // proceso seleccionado en la vista

    const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const TURNOS = ['T1','T2','T3'];

    const anioInput   = document.getElementById('input-anio');
    const semanaInput = document.getElementById('input-semana');
    const selProcVista = document.getElementById('select-proceso-vista');

    // Inicializar con semana actual
    const isoData = getISOWeekData(new Date());
    anioInput.value   = isoData.anio;
    semanaInput.value = isoData.semana_iso;

    await cargarCatalogos();
    await cargarPlan();

    // ── Selector de proceso → re-renderiza grid ─────────────────────────
    selProcVista.addEventListener('change', () => {
        const pid = selProcVista.value;
        procesoActual = pid ? procesos.find(p => String(p.processId) === String(pid)) : null;
        actualizarBreadcrumb();
        renderGrid();
    });

    // ── Botón volver al dashboard ────────────────────────────────────────
    document.getElementById('btn-volver-dashboard')?.addEventListener('click', () => {
        procesoActual = null;
        selProcVista.value = '';
        actualizarBreadcrumb();
        renderGrid();
    });

    function actualizarBreadcrumb() {
        const el = document.getElementById('breadcrumb-proceso');
        if (el) el.textContent = procesoActual?.nombre || '—';
    }

    // ── KPIs ────────────────────────────────────────────────────────────
    async function cargarKPIs() {
        if (!currentPlan?.id) {
            document.getElementById('kpi-indicator').style.display = 'none';
            return;
        }
        const res  = await fetch(`/api/planning/kpi/${currentPlan.id}`);
        const kpis = await res.json();
        if (kpis) {
            document.getElementById('kpi-indicator').style.display = 'flex';
            document.getElementById('kpi-value').textContent = `${kpis.cumplimiento_global}%`;
        }
    }

    // ── Catálogos ────────────────────────────────────────────────────────
    async function cargarCatalogos() {
        const [procRes, ordRes, persRes, rolesRes, maqRes, motRes] = await Promise.all([
            fetch('/api/procesos'),
            fetch('/api/ordenes-produccion?estado=Liberada'),
            fetch('/api/personal'),
            fetch('/api/personal/roles-operativos'),
            fetch('/api/maquinas'),
            fetch('/api/planning/motivos-desviacion')
        ]);

        procesos        = (await procRes.json()).data  || [];
        ordenes         = (await ordRes.json()).data   || [];
        personal        = (await persRes.json()).data  || [];
        rolesOperativos = (await rolesRes.json()).data || [];
        maquinas        = (await maqRes.json()).data   || [];

        const motivos = await motRes.json();
        const optsMotivos = motivos.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
        document.getElementById('select-motivo-ajuste').innerHTML       = optsMotivos;
        document.getElementById('select-motivo-desviacion-dd').innerHTML = optsMotivos;

        // Llenar selector de proceso en topbar
        selProcVista.innerHTML = '<option value="">— Seleccionar proceso —</option>' +
            procesos.map(p => `<option value="${p.processId}">${p.nombre}</option>`).join('');

        // select-orden se llena dinámicamente al abrir el modal, filtrado por proceso

        // Llenar select-persona / select-rol-op (compatibilidad con código legado)
        document.getElementById('select-persona').innerHTML =
            personal.map(p => `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');
        document.getElementById('select-rol-op').innerHTML =
            rolesOperativos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');

        // Llenar filter-proceso (oculto, compatibilidad)
        document.getElementById('filter-proceso').innerHTML =
            '<option value="">Todos los Procesos</option>' +
            procesos.map(p => `<option value="${p.processId}">${p.nombre}</option>`).join('');
    }

    // ── Cargar plan semana ───────────────────────────────────────────────
    async function cargarPlan() {
        const res  = await fetch(`/api/planning/week/${anioInput.value}/${semanaInput.value}`);
        const data = await res.json();

        if (data?.id) {
            currentPlan = data;

            // Rellenar fechas en cabecera de columnas
            if (data.fecha_inicio) {
                const base = new Date(data.fecha_inicio + 'T00:00:00');
                for (let d = 1; d <= 7; d++) {
                    const f = new Date(base);
                    f.setDate(base.getDate() + d - 1);
                    const el = document.getElementById(`fecha-dia-${d}`);
                    if (el) el.textContent = f.toLocaleDateString('es', { day:'2-digit', month:'2-digit' });
                }
            }

            document.getElementById('no-plan-alert').style.display      = 'none';
            document.getElementById('planning-container').style.display  = 'block';
            document.getElementById('plan-status-bar').style.display     = 'flex';

            const badge = document.getElementById('plan-estado-badge');
            badge.textContent = data.estado;
            badge.className   = `badge badge-${data.estado.toLowerCase()}`;
            document.getElementById('plan-fechas-rango').textContent = `${data.fecha_inicio} al ${data.fecha_fin}`;
            cargarKPIs();
            renderGrid();
            renderDashboard();
        } else {
            currentPlan = null;
            document.getElementById('no-plan-alert').style.display      = 'none';
            document.getElementById('planning-container').style.display  = 'block';
            document.getElementById('plan-status-bar').style.display     = 'none';
            renderGrid();
            renderDashboard();
        }
    }

    // ── Renderizar dashboard de procesos ─────────────────────────────────
    function renderDashboard() {
        const banner = document.getElementById('dashboard-semana-banner');
        const grid   = document.getElementById('procesos-grid');
        if (!grid) return;

        // Banner semana — solo si hay plan
        if (currentPlan && banner) {
            banner.style.display = 'flex';
            document.getElementById('dash-semana-num').textContent   = `S${currentPlan.semana_iso}`;
            document.getElementById('dash-semana-rango').textContent = `${currentPlan.fecha_inicio} al ${currentPlan.fecha_fin}`;

            const badgeEl = document.getElementById('dash-plan-estado');
            badgeEl.innerHTML = `<span class="badge badge-${(currentPlan.estado||'').toLowerCase()}">${currentPlan.estado}</span>`;

            const esBorrador = currentPlan.estado === 'BORRADOR' || currentPlan.estado === 'AJUSTADO';
            document.getElementById('btn-publicar').style.display         = esBorrador ? 'inline-flex' : 'none';
            document.getElementById('btn-siguiente-semana').style.display = 'inline-flex';
        } else if (banner) {
            banner.style.display = 'none';
            document.getElementById('btn-publicar').style.display         = 'none';
            document.getElementById('btn-siguiente-semana').style.display = 'none';
        }

        // Sin plan: mostrar aviso + botón crear
        const noPlanAlert = document.getElementById('no-plan-alert');
        if (!currentPlan) {
            noPlanAlert.style.display = 'block';
            grid.innerHTML = '';
            return;
        }
        noPlanAlert.style.display = 'none';

        // Contar turnos asignados por proceso
        const turnosPorProceso = {};
        (currentPlan?.ordenes || []).forEach(o => {
            const pid = String(o.proceso_id);
            turnosPorProceso[pid] = (turnosPorProceso[pid] || 0) + 1;
        });

        const procesosConPlan = Object.keys(turnosPorProceso).length;
        document.getElementById('dash-procesos-ok').textContent    = procesosConPlan;
        document.getElementById('dash-procesos-total').textContent = procesos.length;

        // Tarjetas
        grid.innerHTML = '';
        procesos.forEach(p => {
            const pid      = String(p.processId);
            const turnos   = turnosPorProceso[pid] || 0;
            const tienePlan = turnos > 0;
            const unidad   = p.unidadesReporte?.produccion || p.unidadProduccion || '';
            const meta     = p.metasProduccion?.metaEstandarTurno;

            const card = document.createElement('div');
            card.className = `proceso-card${tienePlan ? ' tiene-plan' : ''}`;

            // Proceso 99 (Tareas Generales) — tarjeta de soporte, sin meta de producción
            const esSoporte = pid === '99';
            const metaHtml  = meta && !esSoporte
                ? `<span class="proceso-stat highlight">Meta: ${meta.toLocaleString()} ${unidad}</span>`
                : esSoporte
                    ? `<span class="proceso-stat" style="color:var(--info);border-color:var(--info);">Soporte / Personal</span>`
                    : '';
            card.innerHTML = `
                <div class="proceso-card-top">
                    <div class="proceso-card-nombre">${p.nombre}</div>
                    <div class="proceso-card-unidad">${unidad}</div>
                </div>
                <div class="proceso-card-body">
                    <div class="proceso-estado">
                        <span class="proceso-dot ${tienePlan ? 'ok' : 'empty'}"></span>
                        <span style="color:${tienePlan ? 'var(--success)' : 'var(--text-secondary)'}">
                            ${tienePlan ? `${turnos} turno${turnos > 1 ? 's' : ''} asignado${turnos > 1 ? 's' : ''}` : 'Sin planificar'}
                        </span>
                    </div>
                    <div class="proceso-card-stats">${metaHtml}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                // Seleccionar en el dropdown y disparar renderGrid
                const sel = document.getElementById('select-proceso-vista');
                sel.value = pid;
                procesoActual = p;
                renderGrid();
            });
            grid.appendChild(card);
        });
        if (window.lucide) lucide.createIcons();
    }

    // ── Renderizar cuadrícula ────────────────────────────────────────────
    function renderGrid() {
        const dashboard = document.getElementById('proceso-dashboard');
        const wrapper   = document.getElementById('grid-wrapper');

        if (!procesoActual) {
            dashboard.style.display = 'block';
            wrapper.style.display   = 'none';
            renderDashboard();
            return;
        }

        dashboard.style.display = 'none';
        wrapper.style.display   = 'block';

        const tbody    = document.getElementById('grid-tbody');
        tbody.innerHTML = '';

        const planClosed = currentPlan?.estado === 'CERRADO';

        TURNOS.forEach(turno => {
            const tr = document.createElement('tr');

            // Celda turno label
            const thTurno = document.createElement('td');
            thTurno.className = 'turno-label';
            thTurno.innerHTML = `<span class="turno-badge turno-${turno}">${turno}</span>`;
            tr.appendChild(thTurno);

            // 7 celdas de días
            for (let dia = 1; dia <= 7; dia++) {
                const td = document.createElement('td');
                td.className = 'turno-cell';

                const ords = (currentPlan?.ordenes || []).filter(o =>
                    String(o.proceso_id) === String(procesoActual.processId) &&
                    o.dia_semana == dia && o.turno === turno
                );
                const pers = (currentPlan?.personal || []).filter(p =>
                    String(p.proceso_id) === String(procesoActual.processId) &&
                    p.dia_semana == dia && p.turno === turno
                );

                if (ords.length === 0 && pers.length === 0) td.classList.add('cell-empty');

                // ── Chips de órdenes (solo nombre producto) ──────────────
                ords.forEach(o => {
                    const chip = document.createElement('div');
                    chip.className = 'orden-chip';
                    chip.setAttribute('data-id',        o.id);
                    chip.setAttribute('data-orden-id',  o.orden_id);
                    chip.setAttribute('data-maquina-id', o.maquina_id || '');
                    // Producto abreviado: cortamos tras los primeros 28 chars
                    const prod = (o.producto || '').length > 28
                        ? (o.producto || '').slice(0, 27) + '…'
                        : (o.producto || '—');
                    chip.innerHTML = `
                        <span class="chip-producto-main" title="${o.codigo_orden} — ${o.producto || ''}">${prod}</span>
                        ${!planClosed ? `<button class="chip-del" title="Quitar orden">×</button>` : ''}
                    `;
                    chip.addEventListener('click', e => {
                        if (e.target.classList.contains('chip-del')) return;
                        abrirEditar(o, 'ORDEN');
                    });
                    if (!planClosed) {
                        chip.querySelector('.chip-del').addEventListener('click', e => {
                            e.stopPropagation();
                            eliminarAsig(o.id, 'ORDEN');
                        });
                    }
                    td.appendChild(chip);
                });

                // ── Sección personal ─────────────────────────────────────
                if (pers.length > 0 || !planClosed) {
                    const secPersonal = document.createElement('div');
                    secPersonal.className = 'personal-section';

                    pers.forEach(p => {
                        const esOperador = /operador|operario/i.test(p.rol_nombre || '');
                        const esAux      = /auxiliar/i.test(p.rol_nombre || '');
                        const iconColor  = esOperador ? 'var(--primary)' : esAux ? 'var(--warning)' : 'var(--text-secondary)';
                        const chip = document.createElement('div');
                        chip.className = 'personal-chip';
                        chip.innerHTML = `
                            <span class="personal-dot" style="background:${iconColor};" title="${p.rol_nombre || 'Sin rol'}"></span>
                            <span class="personal-nombre" title="${p.nombre} ${p.apellido} · ${p.rol_nombre || ''}">${p.nombre} ${p.apellido}</span>
                            ${!planClosed ? `<button class="chip-del" title="Quitar">×</button>` : ''}
                        `;
                        if (!planClosed) {
                            chip.querySelector('.chip-del').addEventListener('click', e => {
                                e.stopPropagation();
                                eliminarAsig(p.id, 'PERSONAL');
                            });
                        }
                        secPersonal.appendChild(chip);
                    });

                    if (!planClosed) {
                        const btnP = document.createElement('button');
                        btnP.className = 'btn-add-personal';
                        btnP.innerHTML = `<i data-lucide="user-plus" style="width:10px;height:10px;"></i> Personal`;
                        btnP.addEventListener('click', () => abrirModalPersonal(procesoActual.processId, dia, turno));
                        secPersonal.appendChild(btnP);
                    }
                    td.appendChild(secPersonal);
                }

                // ── Botón + Asignar orden ─────────────────────────────────
                if (!planClosed) {
                    const btn = document.createElement('button');
                    btn.className = 'btn-add-orden';
                    btn.innerHTML = `<i data-lucide="plus" style="width:11px;height:11px;"></i> Orden`;
                    btn.addEventListener('click', () => abrirModal(procesoActual.processId, dia, turno));
                    td.appendChild(btn);
                }

                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        });

        if (window.lucide) lucide.createIcons();
        renderOrdenesDisponibles();
    }

    // ── Panel inferior: órdenes disponibles filtradas por proceso ────────
    function renderOrdenesDisponibles() {
        const lista = document.getElementById('ordenes-disp-lista');
        const count = document.getElementById('ordenes-disp-count');
        if (!lista || !procesoActual) return;

        const pid    = String(procesoActual.processId);
        const unidad = procesoActual.unidadesReporte?.produccion ||
                       procesoActual.unidadProduccion || '';

        const filtradas = ordenes.filter(o => {
            const esEM = o.origen === 'EMERGENCIA' || String(o.codigo_orden).startsWith('EM-');
            return esEM || String(o.codigo_orden).startsWith(pid);
        });

        const yaEnPlan = new Set(
            (currentPlan?.ordenes || [])
                .filter(o => String(o.proceso_id) === pid)
                .map(o => String(o.orden_id))
        );

        count.textContent = filtradas.length;

        if (filtradas.length === 0) {
            lista.innerHTML = `<span style="font-size:12px;color:var(--text-secondary);">No hay órdenes liberadas para este proceso.</span>`;
            return;
        }

        lista.innerHTML = '';
        filtradas.forEach(o => {
            const asignada = yaEnPlan.has(String(o.id));
            const card     = document.createElement('div');
            card.className = 'orden-disp-card';
            const cant     = parseFloat(o.cantidad_objetivo || 0).toLocaleString();
            card.innerHTML = `
                <span class="odc-codigo">${o.codigo_orden}</span>
                <span class="odc-producto">${o.producto || '—'}</span>
                <div class="odc-meta">
                    <span class="odc-tag">${cant} ${unidad}</span>
                    ${asignada ? '<span class="odc-tag ya-asignada">✓ En plan</span>' : ''}
                </div>
            `;
            lista.appendChild(card);
        });
    }

    // ── Llenar select-orden filtrado por proceso ─────────────────────────
    // Muestra solo órdenes cuyo código_orden empieza por el dígito del proceso.
    // Las órdenes de emergencia (origen === 'EMERGENCIA' o código EM-) siempre aparecen.
    function llenarSelectOrdenes(procesoId, valorActual = '') {
        const sel = document.getElementById('select-orden');
        const pid = String(procesoId);

        const filtradas = ordenes.filter(o => {
            const esEmergencia = o.origen === 'EMERGENCIA' ||
                                 String(o.codigo_orden).startsWith('EM-');
            const perteneceAlProceso = String(o.codigo_orden).startsWith(pid);
            return esEmergencia || perteneceAlProceso;
        });

        sel.innerHTML = '<option value="">— Seleccionar orden —</option>' +
            filtradas.map(o => {
                const esEM = o.origen === 'EMERGENCIA' || String(o.codigo_orden).startsWith('EM-');
                const label = esEM
                    ? `⚡ ${o.codigo_orden} — ${o.producto}`
                    : `${o.codigo_orden} — ${o.producto}`;
                return `<option value="${o.id}" ${String(o.id) === String(valorActual) ? 'selected' : ''}>${label}</option>`;
            }).join('');
    }


    // ── Auto-llenado: calcular turnos necesarios para completar una orden ─
    // Retorna array de { dia, turno, meta } ordenados T1→T2→T3, Lun→Dom,
    // comenzando desde el slot (diaInicio, turnoInicio).
    // Si encuentra un slot ya ocupado, retorna null (colisión detectada).
    function calcularAutoLlenado(ordenId, diaInicio, turnoInicio, metaArranque, metaEstandar) {
        const orden = ordenes.find(o => String(o.id) === String(ordenId));
        if (!orden) return null;

        const totalObjetivo = parseFloat(orden.cantidad_objetivo) || 0;
        if (totalObjetivo <= 0) return null;

        // Generar secuencia de slots desde (diaInicio, turnoInicio) hasta Dom T3
        const slots = [];
        for (let d = diaInicio; d <= 7; d++) {
            const turnosDelDia = d === diaInicio
                ? TURNOS.slice(TURNOS.indexOf(turnoInicio))
                : TURNOS;
            for (const t of turnosDelDia) {
                slots.push({ dia: d, turno: t });
            }
        }

        // Verificar colisiones: slots que ya tienen OTRA orden del mismo proceso
        const asignadas = (currentPlan?.ordenes || []).filter(o =>
            String(o.proceso_id) === String(procesoActual.processId)
        );

        const resultado = [];
        let restante = totalObjetivo;
        let primero  = true;

        for (const slot of slots) {
            if (restante <= 0) break;

            const ocupado = asignadas.find(o =>
                o.dia_semana == slot.dia && o.turno === slot.turno
            );
            if (ocupado) {
                // Colisión — devolvemos lo que llevaríamos hasta aquí + info de colisión
                return { colision: slot, asignados: resultado, restante };
            }

            const meta = primero ? metaArranque : metaEstandar;
            const asignar = Math.min(meta, restante);
            resultado.push({ dia: slot.dia, turno: slot.turno, meta: asignar });
            restante -= asignar;
            primero = false;
        }

        return { colision: null, asignados: resultado, restante };
    }

    // Recalcula y actualiza el panel de preview de auto-llenado en el modal
    function actualizarPanelAutoLlenado() {
        const panel = document.getElementById('autofill-panel');
        if (!panel) return;

        const ordenId      = document.getElementById('select-orden').value;
        const diaInicio    = parseInt(document.getElementById('form-dia').value);
        const turnoInicio  = document.getElementById('form-turno').value;
        const soloEste     = document.getElementById('autofill-solo-este')?.checked;

        if (!ordenId || soloEste) {
            panel.querySelector('#autofill-preview').innerHTML = '';
            panel.querySelector('#autofill-resumen').textContent = '';
            return;
        }

        const proc         = procesoActual;
        const metaEstandar = proc?.metasProduccion?.metaEstandarTurno || 0;
        const unidad       = proc?.unidadesReporte?.produccion || proc?.unidadProduccion || '';
        const metaArranque = parseInt(document.getElementById('autofill-meta-arranque')?.value || 0);

        if (!metaEstandar) {
            panel.querySelector('#autofill-resumen').textContent = 'Este proceso no tiene meta estándar definida.';
            return;
        }

        const resultado = calcularAutoLlenado(ordenId, diaInicio, turnoInicio, metaArranque, metaEstandar);
        if (!resultado) {
            panel.querySelector('#autofill-resumen').textContent = 'No se puede calcular (orden no encontrada).';
            return;
        }

        const { colision, asignados, restante } = resultado;

        // Preview de slots
        const preview = asignados.slice(0, 10).map(s =>
            `<span class="autofill-slot">${DIAS[s.dia-1].slice(0,3)} ${s.turno} · <b>${s.meta.toLocaleString()}</b></span>`
        ).join('') + (asignados.length > 10 ? `<span class="autofill-slot-more">+${asignados.length-10} más</span>` : '');
        panel.querySelector('#autofill-preview').innerHTML = preview;

        // Resumen
        let resumen = `${asignados.length} turno(s) asignado(s)`;
        if (restante > 0 && !colision) {
            resumen += ` · Quedan <b>${restante.toLocaleString()} ${unidad}</b> para la siguiente semana`;
        } else if (restante <= 0) {
            resumen += ' · ✓ Orden completada en esta semana';
        }
        if (colision) {
            resumen += ` · ⚠ Colisión en ${DIAS[colision.dia-1]} ${colision.turno} — se detuvo ahí`;
        }
        panel.querySelector('#autofill-resumen').innerHTML = resumen;
    }

    function abrirModal(procesoId, dia, turno) {
        document.getElementById('form-proceso').value = procesoId;
        document.getElementById('form-dia').value     = dia;
        document.getElementById('form-turno').value   = turno;

        const isPublicado = currentPlan.estado === 'PUBLICADO' || currentPlan.estado === 'AJUSTADO';
        document.getElementById('group-desviacion-plan').style.display = isPublicado ? 'block' : 'none';

        const selMaq  = document.getElementById('select-maquina');
        const maqProc = maquinas.filter(m => m.proceso_id == procesoId);
        selMaq.innerHTML = '<option value="">Sin máquina fija</option>' +
            maqProc.map(m => `<option value="${m.id}">${m.nombre_visible}</option>`).join('');
        // Autoseleccionar si solo hay una máquina en el proceso
        selMaq.value = maqProc.length === 1 ? maqProc[0].id : '';

        llenarSelectOrdenes(procesoId);
        document.getElementById('modal-title').textContent = 'Asignar Orden';
        document.getElementById('modal-context-text').innerHTML =
            `<strong>${procesoActual?.nombre || ''}</strong> &mdash; ${DIAS[dia-1]} &mdash; ${turno}`;

        // Panel auto-llenado: solo si es primera asignación (plan en borrador) y proceso tiene meta
        const proc         = procesoActual;
        const metaEstandar = proc?.metasProduccion?.metaEstandarTurno || 0;
        const unidad       = proc?.unidadesReporte?.produccion || proc?.unidadProduccion || '';
        const panelAF      = document.getElementById('autofill-panel');

        // ¿Ya tiene esta orden asignada en algún turno de la semana?
        // (lo sabremos cuando el usuario seleccione la orden — por ahora mostramos el panel)
        if (panelAF && metaEstandar && !isPublicado) {
            panelAF.style.display = 'block';
            document.getElementById('autofill-meta-arranque').value = Math.round(metaEstandar * 0.6);
            document.getElementById('autofill-meta-estandar').textContent =
                `${metaEstandar.toLocaleString()} ${unidad}`;
            document.getElementById('autofill-solo-este').checked = false;
            actualizarPanelAutoLlenado();
        } else if (panelAF) {
            panelAF.style.display = 'none';
        }

        const modal = document.getElementById('modal-asignar');
        modal.removeAttribute('data-edit-id');
        modal.classList.add('active');
        if (window.lucide) lucide.createIcons();
    }

    // ── Modal Personal ────────────────────────────────────────────────────
    function cerrarModalPersonal() {
        document.getElementById('modal-personal').classList.remove('active');
    }

    document.getElementById('btn-cerrar-personal-x').addEventListener('click', cerrarModalPersonal);

    function llenarSelectPersonal(selId, valorActual = '') {
        const sel = document.getElementById(selId);
        sel.innerHTML = '<option value="">— Sin asignar —</option>' +
            personal.map(p =>
                `<option value="${p.id}" ${String(p.id) === String(valorActual) ? 'selected' : ''}>${p.nombre} ${p.apellido}</option>`
            ).join('');
    }

    function llenarSelectRoles(selId, valorActual = '') {
        const sel = document.getElementById(selId);
        sel.innerHTML = '<option value="">Sin rol específico</option>' +
            rolesOperativos.map(r =>
                `<option value="${r.id}" ${String(r.id) === String(valorActual) ? 'selected' : ''}>${r.nombre}</option>`
            ).join('');
    }

    function abrirModalPersonal(procesoId, dia, turno) {
        const modal = document.getElementById('modal-personal');
        document.getElementById('pform-proceso').value = procesoId;
        document.getElementById('pform-dia').value     = dia;
        document.getElementById('pform-turno').value   = turno;

        document.getElementById('pmodal-context-text').innerHTML =
            `<strong>${procesoActual?.nombre || ''}</strong> &mdash; ${DIAS[dia-1]} &mdash; ${turno}`;

        llenarSelectPersonal('select-operador-p');
        llenarSelectPersonal('select-auxiliar-p');

        // Máquina
        const selMaq  = document.getElementById('pselect-maquina');
        const maqProc = maquinas.filter(m => m.proceso_id == procesoId);
        selMaq.innerHTML = '<option value="">Sin máquina fija</option>' +
            maqProc.map(m => `<option value="${m.id}">${m.nombre_visible}</option>`).join('');
        selMaq.value = maqProc.length === 1 ? maqProc[0].id : '';

        document.getElementById('personal-autofill-check').checked = true;
        document.getElementById('pmodal-title').textContent = 'Asignar Personal';
        modal.removeAttribute('data-edit-id');
        modal.classList.add('active');
        if (window.lucide) lucide.createIcons();
    }

    document.getElementById('btn-guardar-personal').onclick = async () => {
        const modal      = document.getElementById('modal-personal');
        const procesoId  = document.getElementById('pform-proceso').value;
        const diaInicio  = parseInt(document.getElementById('pform-dia').value);
        const turno      = document.getElementById('pform-turno').value;
        const maquinaId  = document.getElementById('pselect-maquina').value || null;
        const autoFill   = document.getElementById('personal-autofill-check').checked;

        const operadorId = document.getElementById('select-operador-p').value;
        const auxId      = document.getElementById('select-auxiliar-p').value;

        if (!operadorId && !auxId) {
            DesignSystem.showErrorModal('Validación', 'Debe asignar al menos un colaborador (Operador o Auxiliar).');
            return;
        }

        const dias = autoFill
            ? Array.from({ length: 8 - diaInicio }, (_, i) => diaInicio + i)
            : [diaInicio];

        const asignaciones = [];
        for (const dia of dias) {
            if (operadorId) asignaciones.push({
                plan_id: currentPlan.id, proceso_id: procesoId,
                dia_semana: dia, turno, persona_id: operadorId,
                rol_operativo_id: null, maquina_id: maquinaId
            });
            if (auxId) asignaciones.push({
                plan_id: currentPlan.id, proceso_id: procesoId,
                dia_semana: dia, turno, persona_id: auxId,
                rol_operativo_id: null, maquina_id: maquinaId
            });
        }

        cerrarModalPersonal();

        let errores = 0;
        for (const payload of asignaciones) {
            const res = await fetch('/api/planning/assign-personnel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) errores++;
        }

        await cargarPlan();

        if (errores > 0) {
            DesignSystem.showErrorModal('Aviso',
                `${asignaciones.length - errores} asignaciones guardadas. ${errores} no se pudieron guardar (posiblemente ya existían).`);
        }
    };

    document.getElementById('btn-cancelar-personal').onclick = cerrarModalPersonal;

    // ── Editar asignación existente ──────────────────────────────────────
    window.abrirEditar = (data, tipo) => {
        if (!currentPlan || currentPlan.estado === 'CERRADO') return;

        document.getElementById('form-proceso').value = data.proceso_id;
        document.getElementById('form-dia').value     = data.dia_semana;
        document.getElementById('form-turno').value   = data.turno;

        const isPublicado = currentPlan.estado === 'PUBLICADO' || currentPlan.estado === 'AJUSTADO';
        document.getElementById('group-desviacion-plan').style.display = isPublicado ? 'block' : 'none';

        const selMaq  = document.getElementById('select-maquina');
        const maqProc = maquinas.filter(m => m.proceso_id == data.proceso_id);
        selMaq.innerHTML = '<option value="">Sin máquina fija</option>' +
            maqProc.map(m => `<option value="${m.id}">${m.nombre_visible}</option>`).join('');
        // Si ya tenía máquina asignada, respetarla; si no y solo hay una, autoseleccionar
        selMaq.value = data.maquina_id || (maqProc.length === 1 ? maqProc[0].id : '');

        llenarSelectOrdenes(data.proceso_id, data.orden_id);
        document.getElementById('modal-title').textContent = 'Editar Asignación';
        document.getElementById('modal-context-text').innerHTML =
            `<strong>${procesoActual?.nombre || ''}</strong> &mdash; ${DIAS[data.dia_semana-1]} &mdash; ${data.turno}`;

        const modal = document.getElementById('modal-asignar');
        modal.setAttribute('data-edit-id', data.id);
        modal.classList.add('active');
        if (window.lucide) lucide.createIcons();
    };

    // ── Eliminar asignación ──────────────────────────────────────────────
    window.eliminarAsig = async (id, tipo) => {
        DesignSystem.showConfirmModal('Eliminar Asignación',
            '¿Está seguro de que desea eliminar esta asignación del plan?', async () => {
                const endpoint = tipo === 'ORDEN'
                    ? '/api/planning/delete-order'
                    : '/api/planning/delete-personnel';
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, plan_id: currentPlan.id })
                });
                await cargarPlan();
            });
    };

    // ── Guardar asignación (modal) ───────────────────────────────────────
    document.getElementById('btn-guardar-asig').onclick = async () => {
        const isPublicado = currentPlan.estado === 'PUBLICADO' || currentPlan.estado === 'AJUSTADO';
        const editId      = document.getElementById('modal-asignar').getAttribute('data-edit-id');
        const ordenId     = document.getElementById('select-orden').value;

        if (!ordenId) {
            DesignSystem.showErrorModal('Validación', 'Debe seleccionar una orden de producción.');
            return;
        }

        const basePayload = {
            plan_id:    currentPlan.id,
            proceso_id: document.getElementById('form-proceso').value,
            dia_semana: document.getElementById('form-dia').value,
            turno:      document.getElementById('form-turno').value,
            orden_id:   ordenId,
            maquina_id: document.getElementById('select-maquina').value || null
        };
        if (editId) basePayload.id = editId;

        if (isPublicado) {
            const motivo = document.getElementById('select-motivo-ajuste').value;
            if (!motivo) {
                DesignSystem.showErrorModal('Validación', 'Debe seleccionar un motivo para modificar el plan publicado.');
                return;
            }
            basePayload.motivo_id  = motivo;
            basePayload.comentario = document.getElementById('comentario-ajuste').value;
        }

        // ¿Auto-llenado activo? (panel visible + no marcó "solo este turno")
        const panelAF  = document.getElementById('autofill-panel');
        const soloEste = document.getElementById('autofill-solo-este')?.checked;
        const proc     = procesoActual;
        const metaEstandar  = proc?.metasProduccion?.metaEstandarTurno || 0;
        const metaArranque  = parseInt(document.getElementById('autofill-meta-arranque')?.value || 0);
        const usarAutoFill  = panelAF?.style.display !== 'none' && !soloEste && !editId && metaEstandar > 0;

        if (usarAutoFill) {
            const diaInicio   = parseInt(basePayload.dia_semana);
            const turnoInicio = basePayload.turno;
            const resultado   = calcularAutoLlenado(ordenId, diaInicio, turnoInicio, metaArranque, metaEstandar);

            if (!resultado || resultado.asignados.length === 0) {
                DesignSystem.showErrorModal('Error', 'No se pudo calcular el auto-llenado.');
                return;
            }

            if (resultado.colision) {
                const { dia, turno } = resultado.colision;
                const msg = `Se detectó una colisión en ${DIAS[dia-1]} ${turno}. ` +
                    `Se asignarán ${resultado.asignados.length} turno(s) antes de esa posición. ¿Continuar?`;
                DesignSystem.showConfirmModal('Colisión detectada', msg, async () => {
                    await ejecutarAutoLlenado(resultado.asignados, basePayload);
                });
                return;
            }

            await ejecutarAutoLlenado(resultado.asignados, basePayload);
            return;
        }

        // Guardado simple (un solo turno)
        const base     = editId ? '/api/planning/update-' : '/api/planning/assign-';
        const res = await fetch(`${base}order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(basePayload)
        });
        if (!res.ok) {
            DesignSystem.showErrorModal('Error', 'No se pudo guardar la asignación.');
            return;
        }
        cerrarModal();
        await cargarPlan();
    };

    // ── Ejecutar auto-llenado: N llamadas secuenciales ───────────────────
    async function ejecutarAutoLlenado(slots, basePayload) {
        cerrarModal();

        // Mostrar indicador de progreso
        const btnPublicar = document.getElementById('btn-publicar');
        const textoOrig   = btnPublicar?.textContent;

        let errores = 0;
        for (const slot of slots) {
            const payload = {
                ...basePayload,
                dia_semana: slot.dia,
                turno:      slot.turno
            };
            delete payload.id; // siempre insertar, no editar
            const res = await fetch('/api/planning/assign-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) errores++;
        }

        await cargarPlan();

        if (errores > 0) {
            DesignSystem.showErrorModal('Auto-llenado parcial',
                `Se guardaron ${slots.length - errores} de ${slots.length} turnos. ` +
                `${errores} turno(s) no se pudieron guardar.`);
        }
    }

    // ── Cerrar modal ─────────────────────────────────────────────────────
    function cerrarModal() {
        const modal = document.getElementById('modal-asignar');
        modal.classList.remove('active');
        modal.removeAttribute('data-edit-id');
        document.getElementById('modal-title').textContent = 'Asignar Orden';
    }

    document.getElementById('btn-cancelar-modal').onclick = cerrarModal;
    document.querySelectorAll('.btn-modal-close').forEach(b => b.addEventListener('click', cerrarModal));

    // Recalcular preview cuando cambia orden, meta arranque o checkbox
    document.getElementById('select-orden').addEventListener('change', () => {
        // Ocultar panel si la orden ya tiene turnos asignados en esta semana (edición)
        const modal   = document.getElementById('modal-asignar');
        const editId  = modal.getAttribute('data-edit-id');
        const panelAF = document.getElementById('autofill-panel');
        if (panelAF && !editId) {
            const ordenId = document.getElementById('select-orden').value;
            const yaAsignada = ordenId && (currentPlan?.ordenes || []).some(o =>
                String(o.orden_id) === String(ordenId) &&
                String(o.proceso_id) === String(procesoActual?.processId)
            );
            panelAF.style.display = (yaAsignada || !ordenId) ? 'none' : 'block';
        }
        actualizarPanelAutoLlenado();
    });
    document.getElementById('autofill-meta-arranque')?.addEventListener('input',  actualizarPanelAutoLlenado);
    document.getElementById('autofill-solo-este')?.addEventListener('change', actualizarPanelAutoLlenado);

    // ── Crear plan ───────────────────────────────────────────────────────
    document.getElementById('btn-crear-plan').onclick = async () => {
        const res = await fetch('/api/planning/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anio: anioInput.value, semana: semanaInput.value })
        });
        if (res.ok) await cargarPlan();
        else DesignSystem.showErrorModal('Error', 'No se pudo crear la planificación para esta semana.');
    };

    // ── Publicar plan ────────────────────────────────────────────────────
    document.getElementById('btn-publicar').onclick = () => {
        DesignSystem.showConfirmModal(
            'Publicar Planificación',
            '¿Desea publicar la planificación? Se volverá visible para el personal de operación.',
            async () => {
                await fetch('/api/planning/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: currentPlan.id })
                });
                await cargarPlan();
            }
        );
    };

    // ── Programar siguiente semana ───────────────────────────────────────
    document.getElementById('btn-siguiente-semana').addEventListener('click', async () => {
        if (!currentPlan) return;

        // Calcular semana siguiente
        const semanaActual = currentPlan.semana_iso;
        const anioActual   = currentPlan.anio || parseInt(document.getElementById('input-anio').value);
        let siguienteSemana = semanaActual + 1;
        let siguienteAnio   = anioActual;
        // Manejo de cambio de año (semana 53/1)
        const maxSemana = new Date(anioActual, 11, 28).getDay() === 4 ? 53 : 52;
        if (siguienteSemana > maxSemana) { siguienteSemana = 1; siguienteAnio++; }

        // Verificar si ya existe plan para esa semana
        const checkRes = await fetch(`/api/planning/week/${siguienteAnio}/${siguienteSemana}`);
        const checkData = await checkRes.json();
        const planExiste = checkData.success && checkData.data?.plan;

        // Calcular órdenes con saldo pendiente (no completadas en la semana actual)
        const ordenesEnPlan    = currentPlan.ordenes || [];
        const ordenesConSaldo  = [];
        const ordenesVistas    = new Set();
        ordenesEnPlan.forEach(o => {
            if (!ordenesVistas.has(o.orden_id)) {
                ordenesVistas.add(o.orden_id);
                // Una orden tiene saldo si aún está Liberada o En Proceso
                const ordenCompleta = ordenes.find(or => or.id === o.orden_id);
                if (ordenCompleta && ['Liberada', 'En Proceso'].includes(ordenCompleta.estado)) {
                    ordenesConSaldo.push(o);
                }
            }
        });

        const msgBase = planExiste
            ? `Ya existe un plan para la semana ${siguienteSemana}/${siguienteAnio}.`
            : `Se creará un plan BORRADOR para la semana ${siguienteSemana}/${siguienteAnio}.`;

        const msgOrdenes = ordenesConSaldo.length > 0
            ? ` Se copiarán automáticamente ${ordenesConSaldo.length} orden(es) con producción pendiente.`
            : ' No hay órdenes con saldo pendiente para traspasar.';

        DesignSystem.showConfirmModal(
            'Programar siguiente semana',
            msgBase + msgOrdenes + ' La publicación debe hacerse manualmente.',
            async () => {
                let planSigId;

                if (planExiste) {
                    planSigId = checkData.data.plan.id;
                } else {
                    // Crear plan borrador siguiente semana
                    const crearRes = await fetch('/api/planning/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ anio: siguienteAnio, semana_iso: siguienteSemana })
                    });
                    const crearData = await crearRes.json();
                    if (!crearData.success) {
                        DesignSystem.showErrorModal('Error', 'No se pudo crear el plan para la siguiente semana.');
                        return;
                    }
                    planSigId = crearData.data?.id || crearData.data?.plan?.id;
                }

                // Traspasar órdenes con saldo — asignar T1 Lunes como punto de inicio
                // El planificador ajustará manualmente desde ahí
                let traspasos = 0;
                for (const o of ordenesConSaldo) {
                    await fetch('/api/planning/assign-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            plan_id:    planSigId,
                            proceso_id: o.proceso_id,
                            dia_semana: 1,
                            turno:      'T1',
                            orden_id:   o.orden_id,
                            maquina_id: o.maquina_id || null
                        })
                    });
                    traspasos++;
                }

                // Navegar a la siguiente semana
                document.getElementById('input-anio').value   = siguienteAnio;
                document.getElementById('input-semana').value = siguienteSemana;
                await cargarPlan();

                if (traspasos > 0) {
                    DesignSystem.showErrorModal('✓ Listo',
                        `Plan semana ${siguienteSemana} listo como BORRADOR. ` +
                        `${traspasos} orden(es) traspasadas al Lunes T1. ` +
                        `Distribuye los turnos y publica cuando esté completo.`);
                }
            }
        );
    });

    document.getElementById('btn-cargar-plan').onclick = cargarPlan;

    // ── Modal desviación (drag & drop legado — mantenido por compatibilidad) ──
    window.mostrarModalDesviacionDD = (params) => {
        document.getElementById('comentario-desviacion-dd').value = '';
        document.getElementById('modal-desviacion').classList.add('active');

        document.getElementById('btn-cancelar-desviacion').onclick = () => {
            document.getElementById('modal-desviacion').classList.remove('active');
        };

        document.getElementById('btn-guardar-desviacion').onclick = async () => {
            const motivo_id = document.getElementById('select-motivo-desviacion-dd').value;
            const comentario = document.getElementById('comentario-desviacion-dd').value;
            if (!motivo_id) {
                DesignSystem.showErrorModal('Error', 'Debe seleccionar un motivo de desviación.');
                return;
            }
            params.payload.motivo_id  = motivo_id;
            params.payload.comentario = comentario;
            try {
                const res = await fetch(params.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params.payload)
                });
                if (!res.ok) throw new Error();
                document.getElementById('modal-desviacion').classList.remove('active');
                await cargarPlan();
            } catch {
                document.getElementById('modal-desviacion').classList.remove('active');
                DesignSystem.showErrorModal('Error', 'No se pudo actualizar la posición.');
            }
        };
    };

    // ── Stubs compatibilidad (filtros — no usados en nueva vista) ────────
    window.aplicarFiltros = () => {};
    window.renderFiltros  = () => {};

    // ── Utilidad ISO week ────────────────────────────────────────────────
    function getISOWeekData(date) {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo    = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return { anio: d.getFullYear(), semana_iso: weekNo };
    }
});