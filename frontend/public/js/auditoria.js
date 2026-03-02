document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('tbody');
    const userFilter = document.querySelector('input[placeholder="Usuario..."]');
    const entityFilter = document.querySelector('select');
    const dateFilter = document.querySelector('input[type="date"]');

    const ENTIDADES = [
        'OrdenProduccion', 'Lote', 'Personal', 'Grupo',
        'Maquina', 'Bitacora', 'Proceso', 'Incidente'
    ];

    function populateEntityFilter() {
        entityFilter.innerHTML = '<option value="">Todas las Entidades</option>';
        ENTIDADES.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e;
            opt.textContent = e;
            entityFilter.appendChild(opt);
        });
    }

    async function fetchAuditLogs() {
        try {
            const params = new URLSearchParams();
            if (userFilter.value) params.append('usuario', userFilter.value);
            if (entityFilter.value) params.append('entidad', entityFilter.value);
            if (dateFilter.value) params.append('fecha', dateFilter.value);

            const res = await fetch(`/api/auditoria?${params.toString()}`);
            if (res.status === 403) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">No tienes permisos para ver los logs de auditoría</td></tr>';
                return;
            }
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Error al cargar logs');

            renderLogs(result.data);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">${error.message}</td></tr>`;
        }
    }

    function renderLogs(logs) {
        tableBody.innerHTML = '';
        if (logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No se encontraron registros de auditoría.</td></tr>';
            return;
        }

        logs.forEach(log => {
            let actionClass = 'badge-info';
            if (log.accion === 'CREATE') actionClass = 'badge-success';
            else if (['UPDATE', 'STATUS_CHANGE'].includes(log.accion)) actionClass = 'badge-warning';
            else if (log.accion.startsWith('DELETE') || log.accion.startsWith('CORRECCION')) actionClass = 'badge-error';

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td style="font-size: 0.8rem; white-space: nowrap;">${new Date(log.fecha_hora).toLocaleString()}</td>
                <td><strong>${log.usuario}</strong></td>
                <td><span class="badge ${actionClass}">${log.accion}</span></td>
                <td>${log.entidad} <span style="font-size: 0.75rem; color: var(--text-muted);">ID: ${log.entidad_id || '-'}</span></td>
                <td>
                    <div style="font-size: 0.85rem;">${log.motivo_cambio || '-'}</div>
                    ${log.valor_anterior || log.valor_nuevo ? `
                        <button class="btn btn-outline btn-sm" onclick="toggleDetails(this)" style="padding: 2px 4px; font-size: 0.7rem; margin-top: 4px;">Ver Diferencia</button>
                        <div class="diff-container" style="display: none; font-family: monospace; font-size: 0.75rem; background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px; margin-top: 4px;">
                            <div style="color: var(--danger);">Ant: ${log.valor_anterior || 'null'}</div>
                            <div style="color: var(--success);">Nue: ${log.valor_nuevo || 'null'}</div>
                        </div>
                    ` : ''}
                </td>
            `;
            tableBody.appendChild(fila);
        });
    }

    window.toggleDetails = (btn) => {
        const container = btn.nextElementSibling;
        if (container.style.display === 'none') {
            container.style.display = 'block';
            btn.textContent = 'Ocultar Diferencia';
        } else {
            container.style.display = 'none';
            btn.textContent = 'Ver Diferencia';
        }
    };

    [userFilter, entityFilter, dateFilter].forEach(el => {
        el.addEventListener('change', fetchAuditLogs);
    });

    userFilter.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') fetchAuditLogs();
    });

    populateEntityFilter();
    fetchAuditLogs();
});
