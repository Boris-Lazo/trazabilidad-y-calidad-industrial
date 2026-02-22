
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-incidente');
    const tabla = document.getElementById('tabla-incidentes');
    const lineaSelect = document.getElementById('linea_ejecucion_id');

    async function cargarLineas() {
        try {
            const res = await fetch('/api/lineas-ejecucion');
            const data = await res.json();
            data.forEach(l => {
                lineaSelect.innerHTML += `<option value="${l.id}">Línea #${l.id} (OP #${l.orden_produccion_id})</option>`;
            });
        } catch (e) {}
    }

    async function cargarIncidentes() {
        try {
            const res = await fetch('/api/incidentes');
            const data = await res.json();
            tabla.innerHTML = '';
            if (data.length === 0) {
                tabla.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay incidentes registrados</td></tr>';
                return;
            }
            data.forEach(inc => {
                let sevClass = 'badge-info';
                if (inc.severidad === 'alta') sevClass = 'badge-error';
                if (inc.severidad === 'media') sevClass = 'badge-warning';

                const fila = `
                    <tr>
                        <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(inc.fecha_creacion).toLocaleString()}</td>
                        <td>
                            <div style="font-weight: 600;">${inc.titulo}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${inc.descripcion}</div>
                        </td>
                        <td><span class="badge ${sevClass}">${inc.severidad}</span></td>
                        <td><span class="badge ${inc.estado === 'abierto' ? 'badge-warning' : 'badge-success'}">${inc.estado}</span></td>
                        <td>
                            ${inc.estado === 'abierto' ? `<button class="button button-outline" onclick="cerrarIncidente(${inc.id})" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">Cerrar</button>` : '-'}
                        </td>
                    </tr>
                `;
                tabla.innerHTML += fila;
            });
        } catch (e) {}
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (data.linea_ejecucion_id === "") delete data.linea_ejecucion_id;

        try {
            const res = await fetch('/api/incidentes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                form.reset();
                cargarIncidentes();
            }
        } catch (e) {}
    });

    window.cerrarIncidente = async (id) => {
        const accion = prompt("Ingrese la acción correctiva aplicada:");
        if (!accion) return;

        try {
            await fetch(`/api/incidentes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'cerrado', accion_correctiva: accion })
            });
            cargarIncidentes();
        } catch (e) {}
    };

    cargarLineas();
    cargarIncidentes();
});
