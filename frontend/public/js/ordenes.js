document.addEventListener('DOMContentLoaded', () => {
    const tablaOrdenesBody = document.querySelector('#tabla-ordenes tbody');
    const filtroEstado     = document.getElementById('filtro-estado');
    const busquedaInput    = document.getElementById('busqueda-ordenes');

    const modalCierre        = document.getElementById('modal-cierre-orden');
    const cierreOrdenInfo    = document.getElementById('cierre-orden-info');
    const motivoCierreInput  = document.getElementById('motivo-cierre');
    const confirmarCierreBtn = document.getElementById('confirmar-cierre-btn');
    const cancelarCierre     = document.getElementById('cancelar-cierre');
    let   ordenSeleccionada  = null;
    let   accionCierre       = null;

    const modalEmergencia    = document.getElementById('modal-emergencia');
    const formEmergencia     = document.getElementById('form-emergencia');
    const btnNuevaEmergencia = document.getElementById('btn-nueva-emergencia');
    const btnCancelarEm      = document.getElementById('btn-cancelar-emergencia');

    const modalVincular          = document.getElementById('modal-vincular-sap');
    const btnConfirmarVincular   = document.getElementById('btn-confirmar-vincular');
    const btnCancelarVincular    = document.getElementById('btn-cancelar-vincular');
    let   ordenParaVincular      = null;

    const UNIDADES_PROCESO = {
        '1':'KG','2':'M','3':'M','4':'UND',
        '5':'UND','6':'KG','7':'UND','8':'KG','9':'UND'
    };

    // Estado de sorting
    let sortCol = null;   // 'orden' | 'producto' | 'cant_objetivo' | 'cant_producida' | 'merma' | 'estado'
    let sortDir = 'asc';  // 'asc' | 'desc'
    let ordenesCache = [];
    let busquedaActual = '';

    // ─── Sorting ───────────────────────────────────────────────────────────────
    document.querySelectorAll('.col-sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            if (sortCol === col) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortCol = col;
                sortDir = 'asc';
            }
            actualizarIconosSort();
            renderTabla();
        });
    });

    function actualizarIconosSort() {
        document.querySelectorAll('.col-sortable').forEach(th => {
            const icon = th.querySelector('.sort-icon');
            if (th.dataset.col === sortCol) {
                icon.textContent = sortDir === 'asc' ? '↑' : '↓';
                icon.style.opacity = '1';
                icon.style.color = 'var(--primary)';
            } else {
                icon.textContent = '↕';
                icon.style.opacity = '0.4';
                icon.style.color = '';
            }
        });
    }

    function sortOrdenes(list) {
        if (!sortCol) return list;
        return [...list].sort((a, b) => {
            let va, vb;
            switch (sortCol) {
                case 'orden':         va = a.codigo_orden || ''; vb = b.codigo_orden || ''; break;
                case 'producto':      va = (a.producto || '').toLowerCase(); vb = (b.producto || '').toLowerCase(); break;
                case 'cant_objetivo': va = a.cantidad_objetivo || 0; vb = b.cantidad_objetivo || 0; break;
                case 'cant_producida':va = a.cantidad_producida || 0; vb = b.cantidad_producida || 0; break;
                case 'merma':         va = a.merma_total || 0; vb = b.merma_total || 0; break;
                case 'estado':        va = a.estado || ''; vb = b.estado || ''; break;
                default: return 0;
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function filtrarPorBusqueda(list) {
        const q = busquedaActual.trim().toLowerCase();
        if (!q) return list;
        return list.filter(o =>
            (o.codigo_orden || '').toLowerCase().includes(q) ||
            (o.producto || '').toLowerCase().includes(q)
        );
    }

    function renderTabla() {
        const lista = sortOrdenes(filtrarPorBusqueda(ordenesCache));
        tablaOrdenesBody.innerHTML = '';

        if (lista.length === 0) {
            const msg = busquedaActual
                ? 'No se encontraron órdenes con ese criterio.'
                : 'No hay órdenes registradas.';
            tablaOrdenesBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${msg}</td></tr>`;
            return;
        }

        lista.forEach(orden => {
            const progreso    = orden.cantidad_objetivo > 0
                ? Math.round((orden.cantidad_producida / orden.cantidad_objetivo) * 100) : 0;
            const metaCumplida = progreso >= 100;
            const activa      = ['Liberada', 'En Proceso'].includes(orden.estado);
            const esEmergencia = orden.origen === 'EMERGENCIA';

            const estadoColors = {
                'Liberada':   'badge-success',
                'En Proceso': 'badge-warning',
                'Completada': 'badge-outline',
                'Cancelada':  'badge-error',
            };
            const badgeClass = estadoColors[orden.estado] || 'badge-info';

            const alertaMeta = metaCumplida && activa
                ? `<span title="Meta cumplida — pendiente completar"
                         style="color:var(--warning);font-size:0.9rem;margin-left:4px;cursor:help;">⚠</span>` : '';

            const badgeOrigen = esEmergencia
                ? `<span class="badge badge-warning" style="font-size:0.65rem;margin-left:4px;">EM</span>` : '';

            const codigoTexto = (esEmergencia && orden.codigo_emergencia)
                ? `<strong>#${orden.codigo_orden}</strong>${badgeOrigen}<br>
                   <small style="color:var(--text-secondary);font-size:0.7rem;">ex ${orden.codigo_emergencia}</small>`
                : `<strong>#${orden.codigo_orden}</strong>${badgeOrigen}`;

            const tr = document.createElement('tr');
            tr.dataset.id = orden.id;
            tr.innerHTML = `
                <td>${codigoTexto}</td>
                <td>${orden.producto || 'N/A'}</td>
                <td>${orden.cantidad_objetivo || 0} ${orden.unidad || ''}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span>${orden.cantidad_producida || 0}</span>
                        <small style="color:var(--text-secondary);">(${progreso}%)</small>
                        ${alertaMeta}
                    </div>
                </td>
                <td>${orden.merma_total || 0} kg</td>
                <td><span class="badge ${badgeClass}">${orden.estado}</span></td>
                <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <a href="/detalles_orden.html?id=${orden.id}"
                           class="button button-outline"
                           style="padding:0.25rem 0.5rem;font-size:0.75rem;">Ver</a>
                        ${activa ? `
                            <button class="button button-primary btn-completar"
                                    data-id="${orden.id}" data-codigo="${orden.codigo_orden}"
                                    style="padding:0.25rem 0.5rem;font-size:0.75rem;">Completar</button>
                            <button class="button btn-cancelar-orden"
                                    data-id="${orden.id}" data-codigo="${orden.codigo_orden}"
                                    style="padding:0.25rem 0.5rem;font-size:0.75rem;background:transparent;border:1px solid var(--danger);color:var(--danger);">Cancelar</button>
                        ` : ''}
                        ${esEmergencia && activa ? `
                            <button class="button button-outline btn-vincular"
                                    data-id="${orden.id}" data-codigo="${orden.codigo_orden}"
                                    style="padding:0.25rem 0.5rem;font-size:0.75rem;color:var(--primary);">Vincular SAP</button>
                        ` : ''}
                    </div>
                </td>
            `;
            tablaOrdenesBody.appendChild(tr);
        });
    }

    async function cargarOrdenes() {
        try {
            const estado = filtroEstado.value;
            const url    = `/api/ordenes-produccion${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`;
            const result = await (await fetch(url)).json();
            ordenesCache = result.data || [];
            renderTabla();
        } catch (err) {
            console.error(err);
            tablaOrdenesBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger);">Error al cargar los datos.</td></tr>';
        }
    }

    async function cambiarEstado(id, nuevoEstado, motivo = null) {
        try {
            const body = { estado: nuevoEstado };
            if (motivo) body.motivo_cierre = motivo;
            const res    = await fetch(`/api/ordenes-produccion/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'No se pudo cambiar el estado.');
            DesignSystem.showToast(`Orden ${nuevoEstado.toLowerCase()} correctamente.`, 'success');
            cargarOrdenes();
        } catch (err) {
            DesignSystem.showErrorModal('Error', err.message);
        }
    }

    // ─── Formulario Crear Orden Individual ─────────────────────────────────────
    const formCrear      = document.getElementById('form-crear-orden');
    const codigoInput    = document.getElementById('codigo_orden');
    const procesoSelect  = document.getElementById('proceso_select');
    const unidadInput    = document.getElementById('unidad');
    const procesoLabel   = document.getElementById('proceso-autodetectado');

    const PROCESO_NOMBRES = {
        '1': 'Extrusor PP',    '2': 'Telares',         '3': 'Laminado',
        '4': 'Imprenta',       '5': 'Conversión SA',   '6': 'Extrusión PE',
        '7': 'Conv. Liner PE', '8': 'Peletizado',      '9': 'Sacos Vestidos'
    };

    // Autodetección al escribir el código SAP
    codigoInput.addEventListener('input', () => {
        const primer = codigoInput.value.trim()[0];
        if (primer && PROCESO_NOMBRES[primer]) {
            procesoSelect.value = primer;
            unidadInput.value   = UNIDADES_PROCESO[primer];
            procesoLabel.textContent = `✓ ${PROCESO_NOMBRES[primer]}`;
        } else {
            procesoSelect.value = '';
            unidadInput.value   = '';
            procesoLabel.textContent = '';
        }
    });

    // Actualizar unidad si el usuario cambia proceso manualmente
    procesoSelect.addEventListener('change', () => {
        unidadInput.value = UNIDADES_PROCESO[procesoSelect.value] || '';
    });

    formCrear?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = codigoInput.value.trim();
        const proceso = procesoSelect.value;

        if (!/^\d{7}$/.test(codigo)) {
            DesignSystem.showErrorModal('Código inválido', 'El código SAP debe tener exactamente 7 dígitos numéricos.');
            return;
        }
        if (!proceso) {
            DesignSystem.showErrorModal('Proceso requerido', 'Ingresa el código SAP para detectar el proceso automáticamente.');
            return;
        }

        const data = {
            codigo_orden:      codigo,
            producto:          document.getElementById('producto').value.trim(),
            cantidad_objetivo: parseFloat(document.getElementById('cantidad_objetivo').value),
            unidad:            UNIDADES_PROCESO[proceso] || 'UND',
            prioridad:         'Media',
            observaciones:     document.getElementById('observaciones').value.trim(),
        };

        try {
            const res    = await fetch('/api/ordenes-produccion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'No se pudo registrar la orden.');
            DesignSystem.showToast(`Orden #${result.data.codigo_orden} registrada.`, 'success');
            formCrear.reset();
            procesoLabel.textContent = '';
            unidadInput.value = '';
            cargarOrdenes();
        } catch (err) {
            DesignSystem.showErrorModal('Error al registrar', err.message);
        }
    });


    busquedaInput.addEventListener('input', () => {
        busquedaActual = busquedaInput.value;
        renderTabla();
    });

    // Delegación en tabla
    tablaOrdenesBody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-id]');
        if (!btn) return;
        const id = btn.dataset.id, codigo = btn.dataset.codigo;
        if (btn.classList.contains('btn-completar')) {
            ordenSeleccionada = { id, codigo }; accionCierre = 'Completada';
            cierreOrdenInfo.textContent = `Marcar como COMPLETADA la orden #${codigo}`;
            motivoCierreInput.placeholder = 'Motivo del cierre (ej: cantidad alcanzada, corte de cliente)';
            modalCierre.style.display = 'flex';
        }
        if (btn.classList.contains('btn-cancelar-orden')) {
            ordenSeleccionada = { id, codigo }; accionCierre = 'Cancelada';
            cierreOrdenInfo.textContent = `CANCELAR la orden #${codigo}`;
            motivoCierreInput.placeholder = 'Motivo de cancelación (obligatorio)';
            modalCierre.style.display = 'flex';
        }
        if (btn.classList.contains('btn-vincular')) {
            ordenParaVincular = { id, codigo };
            document.getElementById('vincular-orden-info').textContent = `Orden de emergencia: #${codigo}`;
            document.getElementById('input-codigo-sap').value = '';
            modalVincular.style.display = 'flex';
        }
    });

    // Modal completar/cancelar
    cancelarCierre.addEventListener('click', () => { modalCierre.style.display = 'none'; motivoCierreInput.value = ''; });
    confirmarCierreBtn.addEventListener('click', () => {
        const motivo = motivoCierreInput.value.trim();
        if (!motivo) { DesignSystem.showErrorModal('Motivo Requerido', 'Debe indicar un motivo.'); return; }
        cambiarEstado(ordenSeleccionada.id, accionCierre, motivo);
        modalCierre.style.display = 'none'; motivoCierreInput.value = '';
    });

    // Modal emergencia
    btnNuevaEmergencia?.addEventListener('click', () => { formEmergencia.reset(); modalEmergencia.style.display = 'flex'; });
    btnCancelarEm?.addEventListener('click',      () => { modalEmergencia.style.display = 'none'; });
    formEmergencia?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const procesoId = document.getElementById('em-proceso').value;
        const data = {
            producto:          document.getElementById('em-producto').value.trim(),
            cantidad_objetivo: parseFloat(document.getElementById('em-cantidad').value),
            unidad:            UNIDADES_PROCESO[procesoId] || 'UND',
            proceso_id:        parseInt(procesoId),
            prioridad:         'Alta',
            motivo_emergencia: document.getElementById('em-motivo').value.trim(),
            observaciones:     document.getElementById('em-observaciones').value.trim(),
        };
        try {
            const res    = await fetch('/api/ordenes-produccion/emergencia/nueva', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al crear orden de emergencia.');
            DesignSystem.showToast(`Orden ${result.data.codigo_orden} creada.`, 'success');
            modalEmergencia.style.display = 'none';
            cargarOrdenes();
        } catch (err) { DesignSystem.showErrorModal('Error', err.message); }
    });

    // Modal vincular
    btnCancelarVincular?.addEventListener('click', () => { modalVincular.style.display = 'none'; });
    btnConfirmarVincular?.addEventListener('click', async () => {
        const codigoSAP = document.getElementById('input-codigo-sap').value.trim();
        if (!codigoSAP) { DesignSystem.showToast('Ingresa el código SAP.', 'warning'); return; }
        try {
            const res    = await fetch(`/api/ordenes-produccion/${ordenParaVincular.id}/vincular-sap`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo_sap: codigoSAP })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al vincular.');
            DesignSystem.showToast(`Orden vinculada a SAP ${codigoSAP}.`, 'success');
            modalVincular.style.display = 'none';
            cargarOrdenes();
        } catch (err) { DesignSystem.showErrorModal('Error al vincular', err.message); }
    });

    filtroEstado.addEventListener('change', cargarOrdenes);
    cargarOrdenes();
});