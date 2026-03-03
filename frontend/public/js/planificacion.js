document.addEventListener('DOMContentLoaded', async () => {
    let currentPlan = null;
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

    async function cargarCatalogos() {
        const [procRes, ordRes, persRes, rolesRes, maqRes] = await Promise.all([
            fetch('/api/procesos'),
            fetch('/api/ordenes-produccion?estado=Liberada'),
            fetch('/api/personal'),
            fetch('/api/personal/roles-operativos'),
            fetch('/api/maquinas')
        ]);

        procesos = (await procRes.json()).data || [];
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

        if (data.plan) {
            currentPlan = data;
            document.getElementById('no-plan-alert').style.display = 'none';
            document.getElementById('planning-container').style.display = 'block';
            document.getElementById('plan-status-bar').style.display = 'block';
            renderPlan();
        } else {
            currentPlan = null;
            document.getElementById('no-plan-alert').style.display = 'block';
            document.getElementById('planning-container').style.display = 'none';
            document.getElementById('plan-status-bar').style.display = 'none';
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
        document.getElementById('btn-publicar').style.display = currentPlan.estado === 'BORRADOR' || currentPlan.estado === 'AJUSTADO' ? 'block' : 'none';

        procesos.forEach(proc => {
            // Celda Proceso
            const cellProc = document.createElement('div');
            cellProc.className = 'grid-cell';
            cellProc.style.fontWeight = 'bold';
            cellProc.style.background = 'rgba(0,0,0,0.02)';
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
                        item.innerHTML = `
                            <span>📦 ${o.codigo_orden}</span>
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
                        item.className = 'planned-item';
                        item.style.borderLeftColor = 'var(--success)';
                        item.innerHTML = `
                            <span>👤 ${p.nombre}</span>
                            <div class="item-actions">
                                <button class="btn-icon" onclick="eliminarAsig(${p.id}, 'PERSONAL')">×</button>
                            </div>
                        `;
                        block.appendChild(item);
                    });

                    if (currentPlan.estado !== 'CERRADO') {
                        const btnAdd = document.createElement('button');
                        btnAdd.className = 'btn btn-secondary';
                        btnAdd.style.width = '100%';
                        btnAdd.style.fontSize = '0.6rem';
                        btnAdd.style.padding = '2px';
                        btnAdd.textContent = '+ Asignar';
                        btnAdd.onclick = () => abrirModal(proc.processId, dia, turno);
                        block.appendChild(btnAdd);
                    }

                    cell.appendChild(block);
                });
                grid.appendChild(cell);
            }
        });
    }

    function abrirModal(procesoId, dia, turno) {
        document.getElementById('form-proceso').value = procesoId;
        document.getElementById('form-dia').value = dia;
        document.getElementById('form-turno').value = turno;

        // Cargar máquinas del proceso
        const selMaq = document.getElementById('select-maquina');
        const maqProc = maquinas.filter(m => m.proceso_id == procesoId);
        selMaq.innerHTML = '<option value="">Sin máquina fija</option>' +
            maqProc.map(m => `<option value="${m.id}">${m.nombre_visible}</option>`).join('');

        document.getElementById('modal-asignar').style.display = 'flex';
    }

    window.eliminarAsig = async (id, tipo) => {
        if (!confirm('¿Eliminar asignación?')) return;
        const endpoint = tipo === 'ORDEN' ? '/api/planning/delete-order' : '/api/planning/delete-personnel';
        await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, plan_id: currentPlan.id })
        });
        await cargarPlan();
    };

    document.getElementById('select-tipo-asig').onchange = (e) => {
        document.getElementById('group-orden').style.display = e.target.value === 'ORDEN' ? 'block' : 'none';
        document.getElementById('group-personal').style.display = e.target.value === 'PERSONAL' ? 'block' : 'none';
    };

    document.getElementById('btn-cancelar-modal').onclick = () => {
        document.getElementById('modal-asignar').style.display = 'none';
    };

    document.getElementById('btn-guardar-asig').onclick = async () => {
        const tipo = document.getElementById('select-tipo-asig').value;
        const payload = {
            plan_id: currentPlan.id,
            proceso_id: document.getElementById('form-proceso').value,
            dia_semana: document.getElementById('form-dia').value,
            turno: document.getElementById('form-turno').value
        };

        if (tipo === 'ORDEN') {
            payload.orden_id = document.getElementById('select-orden').value;
            payload.maquina_id = document.getElementById('select-maquina').value || null;
            await fetch('/api/planning/assign-order', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
        } else {
            payload.persona_id = document.getElementById('select-persona').value;
            payload.rol_operativo_id = document.getElementById('select-rol-op').value;
            await fetch('/api/planning/assign-personnel', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
        }

        document.getElementById('modal-asignar').style.display = 'none';
        await cargarPlan();
    };

    document.getElementById('btn-crear-plan').onclick = async () => {
        const res = await fetch('/api/planning/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ anio: anioInput.value, semana: semanaInput.value })
        });
        if (res.ok) await cargarPlan();
        else alert('Error al crear plan');
    };

    document.getElementById('btn-publicar').onclick = async () => {
        if (!confirm('¿Publicar planificación? Se volverá visible para operación.')) return;
        await fetch('/api/planning/publish', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: currentPlan.id })
        });
        await cargarPlan();
    };

    document.getElementById('btn-cargar-plan').onclick = cargarPlan;

    function getISOWeekData(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return { anio: d.getFullYear(), semana_iso: weekNo };
    }
});
