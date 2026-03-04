document.addEventListener('DOMContentLoaded', async () => {
    let currentPlan = null;
    let dragulaInst = null;
    let procesos = [];
    let ordenes = [];
    let personal = [];
    let rolesOperativos = [];
    let maquinas = [];

    const anioInput = document.getElementById('input-anio');
    const semanaInput = document.getElementById('input-semana');

    // Inicializar inputs con semana actual
    const now = new Date();
    const isoData = getISOWeekData(now);
    anioInput.value = isoData.anio;
    semanaInput.value = isoData.semana_iso;

    await cargarCatalogos();
    await cargarPlan();

    async function cargarKPIs() {
        if (!currentPlan || currentPlan.id === undefined) {
            document.getElementById('kpi-indicator').classList.add('d-none');
            return;
        }

        const res = await fetch(`/api/planning/kpi/${currentPlan.id}`);
        const kpis = await res.json();

        if (kpis) {
            document.getElementById('kpi-indicator').classList.remove('d-none');
            document.getElementById('kpi-value').textContent = `${kpis.cumplimiento_global}%`;
        }
    }

    async function cargarCatalogos() {
        const [procRes, ordRes, persRes, rolesRes, maqRes, motRes] = await Promise.all([
            fetch('/api/procesos'),
            fetch('/api/ordenes-produccion?estado=Liberada'),
            fetch('/api/personal'),
            fetch('/api/personal/roles-operativos'),
            fetch('/api/maquinas'),
            fetch('/api/planning/motivos-desviacion')
        ]);

        procesos = (await procRes.json()).data || [];
        const selProc = document.getElementById('filter-proceso');
        if (selProc) {
            selProc.innerHTML = '<option value="">Todos los Procesos</option>' + procesos.map(proc => `<option value="${proc.processId}">${proc.nombre}</option>`).join('');
        }

        const motivos = (await motRes.json());
        const optionsMotivos = motivos.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
        document.getElementById('select-motivo-ajuste').innerHTML = optionsMotivos;
        document.getElementById('select-motivo-desviacion-dd').innerHTML = optionsMotivos;
        ordenes = (await ordRes.json()).data || [];
        personal = (await persRes.json()).data || [];
        rolesOperativos = (await rolesRes.json()).data || [];
        maquinas = (await maqRes.json()).data || [];

        // Llenar selectores del modal
        const selOrden = document.getElementById('select-orden');
        selOrden.innerHTML = ordenes.map(o => `<option value="${o.id}">${o.codigo_orden} - ${o.producto}</option>`).join('');

        const selPersona = document.getElementById('select-persona');
        selPersona.innerHTML = personal.map(p => `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');

        const selRol = document.getElementById('select-rol-op');
        selRol.innerHTML = rolesOperativos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
    }

    async function cargarPlan() {
        const anio = anioInput.value;
        const semana = semanaInput.value;

        const res = await fetch(`/api/planning/week/${anio}/${semana}`);
        const data = await res.json();

        if (data && data.id) {
            currentPlan = data;
            document.getElementById('no-plan-alert').classList.add('d-none');
            document.getElementById('planning-container').classList.remove('d-none');
            document.getElementById('planning-filters').classList.remove('d-none');
            document.getElementById('plan-status-bar').classList.remove('d-none');
            renderPlan();
            cargarKPIs();
            renderFiltros();
        } else {
            currentPlan = null;
            document.getElementById('no-plan-alert').classList.remove('d-none');
            document.getElementById('planning-container').classList.add('d-none');
            document.getElementById('planning-filters').classList.add('d-none');
            document.getElementById('plan-status-bar').classList.add('d-none');
        }
    }

    function renderPlan() {
        const grid = document.getElementById('grid-main');
        // Limpiar filas anteriores (mantener header)
        while (grid.children.length > 8) grid.lastChild.remove();

        const badge = document.getElementById('plan-estado-badge');
        badge.textContent = currentPlan.estado;
        badge.className = `badge badge-${currentPlan.estado.toLowerCase()}`;

        document.getElementById('plan-fechas-rango').textContent = `${currentPlan.fecha_inicio} al ${currentPlan.fecha_fin}`;
        if (currentPlan.estado === 'BORRADOR' || currentPlan.estado === 'AJUSTADO') {
            document.getElementById('btn-publicar').classList.remove('d-none');
        } else {
            document.getElementById('btn-publicar').classList.add('d-none');
        }

        procesos.forEach(proc => {
            // Celda Proceso
            const cellProc = document.createElement('div');
            cellProc.className = 'grid-cell text-bold bg-black-002';
            cellProc.textContent = proc.nombre;
            grid.appendChild(cellProc);

            // Celdas por Día
            for (let dia = 1; dia <= 7; dia++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';

                ['T1', 'T2', 'T3'].forEach(turno => {
                    const block = document.createElement('div');
                    block.className = 'shift-block';
                    block.innerHTML = `<div class="shift-title">${turno}</div>`;

                    // Ordenes
                    const ords = (currentPlan.ordenes || []).filter(o => o.proceso_id == proc.processId && o.dia_semana == dia && o.turno == turno);
                    ords.forEach(o => {
                        const item = document.createElement('div');
                        item.className = 'planned-item';
                        item.setAttribute('data-id', o.id);
                        item.setAttribute('data-orden-id', o.orden_id);
                        item.setAttribute('data-maquina-id', o.maquina_id || '');
                        item.setAttribute('data-texto', `${o.codigo_orden} ${o.producto}`.toLowerCase());
                        item.setAttribute('title', 'Clic para editar');
                        item.classList.add('cursor-pointer');

                        item.innerHTML = `
                            <span onclick='abrirEditar(${JSON.stringify(o).replace(/'/g, "&#39;")}, "ORDEN")' class="flex-1">📦 ${o.codigo_orden}</span>
                            <div class="item-actions">
                                <button class="btn-icon" onclick="eliminarAsig(${o.id}, 'ORDEN')">×</button>
                            </div>
                        `;
                        block.appendChild(item);
                    });

                    // Personal
                    const pers = (currentPlan.personal || []).filter(p => p.proceso_id == proc.processId && p.dia_semana == dia && p.turno == turno);
                    pers.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'planned-item planned-item-personal';
                        item.setAttribute('data-id', p.id);
                        item.setAttribute('data-personal-id', p.persona_id);
                        item.setAttribute('data-rol-id', p.rol_operativo_id || '');
                        item.setAttribute('data-maquina-id', p.maquina_id || '');
                        item.setAttribute('data-texto', `${p.nombre} ${p.apellido} ${p.rol_nombre || ''}`.toLowerCase());
                        item.setAttribute('title', 'Clic para editar');
                        item.classList.add('cursor-pointer');

                        item.innerHTML = `
                            <span onclick='abrirEditar(${JSON.stringify(p).replace(/'/g, "&#39;")}, "PERSONAL")' class="flex-1">👤 ${p.nombre}</span>
                            <div class="item-actions">
                                <button class="btn-icon" onclick="eliminarAsig(${p.id}, 'PERSONAL')">×</button>
                            </div>
                        `;
                        block.appendChild(item);
                    });

                    block.setAttribute('data-proceso', proc.processId);
                    block.setAttribute('data-dia', dia);
                    block.setAttribute('data-turno', turno);

                    if (currentPlan.estado !== 'CERRADO') {
                        const btnAdd = document.createElement('button');
                        btnAdd.className = 'btn btn-secondary w-100 font-xs p-0';
                        btnAdd.textContent = '+ Asignar';
                        btnAdd.onclick = () => abrirModal(proc.processId, dia, turno);
                        block.appendChild(btnAdd);
                    }

                    cell.appendChild(block);
                });
                grid.appendChild(cell);
            }
        });

        initDragAndDrop();
        aplicarFiltros(); // Re-aplicar filtros si están activos
    }

    function initDragAndDrop() {
        if (dragulaInst) dragulaInst.destroy();
        if (!currentPlan || currentPlan.estado === 'CERRADO') return;

        const containers = Array.from(document.querySelectorAll('.shift-block'));
        dragulaInst = dragula(containers, {
            accepts: function (el, target, source, sibling) {
                // Ensure we don't drop items before the shift title
                if (sibling && sibling.classList.contains('shift-title')) {
                    return false;
                }
                // Don't drop items on or after the add button
                if (sibling && sibling.tagName === 'BUTTON') {
                    return false;
                }
                return true;
            },
            invalid: function (el, handle) {
                return el.classList.contains('shift-title') || el.tagName === 'BUTTON';
            }
        });

        dragulaInst.on('drop', async (el, target, source, sibling) => {
            const isOrden = el.hasAttribute('data-orden-id');
            const asigId = el.getAttribute('data-id');
            const targetTurno = target.getAttribute('data-turno');
            const targetDia = target.getAttribute('data-dia');
            const targetProceso = target.getAttribute('data-proceso');

            const endpoint = isOrden ? '/api/planning/update-order' : '/api/planning/update-personnel';

            const payload = {
                id: asigId,
                plan_id: currentPlan.id,
                proceso_id: targetProceso,
                dia_semana: targetDia,
                turno: targetTurno,
                maquina_id: el.getAttribute('data-maquina-id') || null
            };

            if (!isOrden) {
                payload.rol_operativo_id = el.getAttribute('data-rol-id') || null;
            }

            const isPublicado = currentPlan.estado === 'PUBLICADO' || currentPlan.estado === 'AJUSTADO';

            if (isPublicado) {
                const modalParams = { el, target, source, sibling, endpoint, payload };
                mostrarModalDesviacionDD(modalParams);
                return;
            }

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    throw new Error('Error guardando posición');
                }
                // Si todo bien, la UI ya refleja el drop. Solo recargamos en background o dejamos así.
                // Mejor recargar para asegurar consistencia
                await cargarPlan();
            } catch (err) {
                console.error(err);
                dragulaInst.cancel(true);
                DesignSystem.showErrorModal('Error', 'No se pudo actualizar la posición de la asignación.');
            }
        });
    }

    function abrirModal(procesoId, dia, turno, asigData = null) {
        document.getElementById('form-proceso').value = procesoId;
        document.getElementById('form-dia').value = dia;
        document.getElementById('form-turno').value = turno;

        const isPublicado = currentPlan.estado === 'PUBLICADO' || currentPlan.estado === 'AJUSTADO';
        if (isPublicado) {
            document.getElementById('group-desviacion-plan').classList.remove('d-none');
        } else {
            document.getElementById('group-desviacion-plan').classList.add('d-none');
        }
        if (isPublicado) {
            document.getElementById('group-desviacion-plan').classList.remove('d-none');
        } else {
            document.getElementById('group-desviacion-plan').classList.add('d-none');
        }

        // Cargar máquinas del proceso
        const selMaq = document.getElementById('select-maquina');
        const maqProc = maquinas.filter(m => m.proceso_id == procesoId);
        selMaq.innerHTML = '<option value="">Sin máquina fija</option>' +
            maqProc.map(m => `<option value="${m.id}">${m.nombre_visible}</option>`).join('');

        document.getElementById('modal-asignar').style.display = 'flex';
        document.getElementById('modal-asignar').removeAttribute('data-edit-id'); // Es nuevo
        document.getElementById('select-tipo-asig').disabled = false;

        // Reset specific values
        document.getElementById('select-orden').value = '';
        document.getElementById('select-maquina').value = '';
        document.getElementById('select-persona').value = '';
        document.getElementById('select-rol-op').value = '';
    }

    window.abrirEditar = (data, tipo) => {
        if (!currentPlan || currentPlan.estado === 'CERRADO') return;

        document.getElementById('form-proceso').value = data.proceso_id;
        document.getElementById('form-dia').value = data.dia_semana;
        document.getElementById('form-turno').value = data.turno;

        const isPublicado = currentPlan.estado === 'PUBLICADO' || currentPlan.estado === 'AJUSTADO';
        document.getElementById('group-desviacion-plan').style.display = isPublicado ? 'block' : 'none';

        // Cargar máquinas del proceso
        const selMaq = document.getElementById('select-maquina');
        const maqProc = maquinas.filter(m => m.proceso_id == data.proceso_id);
        selMaq.innerHTML = '<option value="">Sin máquina fija</option>' +
            maqProc.map(m => `<option value="${m.id}">${m.nombre_visible}</option>`).join('');

        document.getElementById('select-tipo-asig').value = tipo;
        document.getElementById('select-tipo-asig').disabled = true; // No se puede cambiar el tipo en edición
        document.getElementById('group-orden').style.display = tipo === 'ORDEN' ? 'block' : 'none';
        document.getElementById('group-personal').style.display = tipo === 'PERSONAL' ? 'block' : 'none';

        if (tipo === 'ORDEN') {
            document.getElementById('select-orden').value = data.orden_id;
            document.getElementById('select-maquina').value = data.maquina_id || '';
        } else {
            document.getElementById('select-persona').value = data.persona_id;
            document.getElementById('select-maquina').value = data.maquina_id || ''; // Personal can also have machinery sometimes
            document.getElementById('select-rol-op').value = data.rol_operativo_id || '';
        }

        const modal = document.getElementById('modal-asignar');
        modal.setAttribute('data-edit-id', data.id); // Guardamos ID de edicion
        document.getElementById('modal-title').textContent = 'Editar Asignación';
        modal.style.display = 'flex';
    };

    window.eliminarAsig = async (id, tipo) => {
        DesignSystem.showConfirmModal('Eliminar Asignación', '¿Está seguro de que desea eliminar esta asignación del plan?', async () => {
            const endpoint = tipo === 'ORDEN' ? '/api/planning/delete-order' : '/api/planning/delete-personnel';
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, plan_id: currentPlan.id })
            });
            await cargarPlan();
        });
    };

    document.getElementById('select-tipo-asig').onchange = (e) => {
        if (e.target.value === 'ORDEN') {
            document.getElementById('group-orden').classList.remove('d-none');
            document.getElementById('group-personal').classList.add('d-none');
        } else {
            document.getElementById('group-orden').classList.add('d-none');
            document.getElementById('group-personal').classList.remove('d-none');
        }
    };

    document.getElementById('btn-cancelar-modal').onclick = () => {
        document.getElementById('modal-asignar').classList.add('d-none');
    };

    document.getElementById('btn-guardar-asig').onclick = async () => {
        const tipo = document.getElementById('select-tipo-asig').value;
        const isPublicado = currentPlan.estado === 'PUBLICADO' || currentPlan.estado === 'AJUSTADO';
        const editId = document.getElementById('modal-asignar').getAttribute('data-edit-id');

        const payload = {
            plan_id: currentPlan.id,
            proceso_id: document.getElementById('form-proceso').value,
            dia_semana: document.getElementById('form-dia').value,
            turno: document.getElementById('form-turno').value
        };

        if (editId) payload.id = editId;

        if (isPublicado) {
            const motivo_ajuste = document.getElementById('select-motivo-ajuste').value;
            if (!motivo_ajuste) {
                DesignSystem.showErrorModal('Validación', 'Debe seleccionar un motivo para modificar el plan publicado.');
                return;
            }
            payload.motivo_id = motivo_ajuste;
            payload.comentario = document.getElementById('comentario-ajuste').value;
        }

        let endpointBase = editId ? '/api/planning/update-' : '/api/planning/assign-';

        if (tipo === 'ORDEN') {
            payload.orden_id = document.getElementById('select-orden').value;
            payload.maquina_id = document.getElementById('select-maquina').value || null;
            await fetch(`${endpointBase}order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            payload.persona_id = document.getElementById('select-persona').value;
            payload.rol_operativo_id = document.getElementById('select-rol-op').value;
            payload.maquina_id = document.getElementById('select-maquina').value || null;
            await fetch(`${endpointBase}personnel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        document.getElementById('modal-asignar').classList.add('d-none');
        document.getElementById('modal-asignar').removeAttribute('data-edit-id');
        document.getElementById('modal-title').textContent = 'Asignar a Plan';
        await cargarPlan();
    };

    document.getElementById('btn-crear-plan').onclick = async () => {
        const res = await fetch('/api/planning/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anio: anioInput.value, semana: semanaInput.value })
        });
        if (res.ok) await cargarPlan();
        else DesignSystem.showErrorModal('Error al Crear Plan', 'No se pudo crear la planificación para la semana seleccionada.');
    };

    document.getElementById('btn-publicar').onclick = async () => {
        DesignSystem.showConfirmModal('Publicar Planificación', '¿Desea publicar la planificación? Se volverá visible para el personal de operación.', async () => {
            await fetch('/api/planning/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: currentPlan.id })
            });
            await cargarPlan();
        });
    };

    document.getElementById('btn-cargar-plan').onclick = cargarPlan;

    // Lógica de Filtros
    function renderFiltros() {
        // Event listeners para filtros
        document.getElementById('filter-proceso').addEventListener('change', aplicarFiltros);
        document.getElementById('filter-turno').addEventListener('change', aplicarFiltros);
        document.getElementById('filter-text').addEventListener('input', aplicarFiltros);
        document.getElementById('btn-clear-filters').addEventListener('click', () => {
            document.getElementById('filter-proceso').value = '';
            document.getElementById('filter-turno').value = '';
            document.getElementById('filter-text').value = '';
            aplicarFiltros();
        });
    }

    window.aplicarFiltros = () => {
        if (!currentPlan) return;

        const selProceso = document.getElementById('filter-proceso').value;
        const selTurno = document.getElementById('filter-turno').value;
        const txtValue = document.getElementById('filter-text').value.toLowerCase();

        // Ocultar/Mostrar procesos completos
        const filasProcesos = document.querySelectorAll('.grid-cell[style*="font-weight: bold"]');
        let indexCelda = 0;

        procesos.forEach((proc, i) => {
            const rowHeader = filasProcesos[i];
            const mostrarProceso = selProceso === '' || proc.processId == selProceso;

            // Si el proceso no coincide, ocultamos toda su fila (header + 7 dias)
            if (mostrarProceso) rowHeader.classList.remove('d-none');
            else rowHeader.classList.add('d-none');

            // Las siguientes 7 celdas pertenecen a este proceso
            const gridCells = document.querySelectorAll('#grid-main > .grid-cell:not(.text-bold)');

            for (let d = 0; d < 7; d++) {
                const dayCell = gridCells[i * 7 + d];
                if (dayCell) {
                    if (mostrarProceso) dayCell.classList.remove('d-none');
                    else dayCell.classList.add('d-none');

                    if (mostrarProceso) {
                        // Filtrar contenido interno de la celda (turnos y items)
                        const turnosBlocks = dayCell.querySelectorAll('.shift-block');
                        turnosBlocks.forEach(tb => {
                            const tName = tb.getAttribute('data-turno');
                            const mostrarTurno = selTurno === '' || selTurno === tName;
                            if (mostrarTurno) tb.classList.remove('d-none');
                            else tb.classList.add('d-none');

                            if (mostrarTurno) {
                                // Filtrar items
                                const items = tb.querySelectorAll('.planned-item');
                                items.forEach(item => {
                                    const textoItem = item.getAttribute('data-texto') || '';
                                    if (txtValue === '' || textoItem.includes(txtValue)) {
                                        item.classList.add('d-flex');
                                        item.classList.remove('d-none');
                                    } else {
                                        item.classList.remove('d-flex');
                                        item.classList.add('d-none');
                                    }
                                });
                            }
                        });
                    }
                }
            }
        });
    };

    function mostrarModalDesviacionDD(params) {
        document.getElementById('comentario-desviacion-dd').value = '';
        const modal = document.getElementById('modal-desviacion');
        modal.classList.add('d-flex');
        modal.classList.remove('d-none');

        document.getElementById('btn-cancelar-desviacion').onclick = () => {
            modal.classList.add('d-none');
            modal.classList.remove('d-flex');
            dragulaInst.cancel(true);
        };

        document.getElementById('btn-guardar-desviacion').onclick = async () => {
            const motivo_id = document.getElementById('select-motivo-desviacion-dd').value;
            const comentario = document.getElementById('comentario-desviacion-dd').value;

            if (!motivo_id) {
                DesignSystem.showErrorModal('Error', 'Debe seleccionar un motivo de desviación.');
                return;
            }

            params.payload.motivo_id = motivo_id;
            params.payload.comentario = comentario;

            try {
                const res = await fetch(params.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params.payload)
                });

                if (!res.ok) {
                    throw new Error('Error guardando posición');
                }
                modal.classList.add('d-none');
                modal.classList.remove('d-flex');
                await cargarPlan();
            } catch (err) {
                console.error(err);
                dragulaInst.cancel(true);
                DesignSystem.showErrorModal('Error', 'No se pudo actualizar la posición de la asignación.');
                modal.classList.add('d-none');
                modal.classList.remove('d-flex');
            }
        };
    }

    function getISOWeekData(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return { anio: d.getFullYear(), semana_iso: weekNo };
    }
});
