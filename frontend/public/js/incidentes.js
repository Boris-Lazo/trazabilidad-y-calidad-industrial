
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-incidente');
    const tabla = document.getElementById('tabla-incidentes');
    const lineaSelect = document.getElementById('linea_ejecucion_id');

    async function cargarIncidentes() {
        try {
            const res = await fetch('/api/incidentes');
            const result = await res.json();
            const data = result.data || [];
            tabla.innerHTML = '';
            if (data.length === 0) {
                tabla.innerHTML = '<tr><td colspan="5" class="text-center">No hay incidentes registrados</td></tr>';
                return;
            }
            data.forEach(inc => {
                let sevClass = 'badge-info';
                if (inc.severidad === 'alta') sevClass = 'badge-error';
                if (inc.severidad === 'media') sevClass = 'badge-warning';

                const fila = `
                    <tr>
                        <td class="font-sm text-muted">${new Date(inc.fecha_creacion).toLocaleString()}</td>
                        <td>
                            <div class="text-bold">${inc.titulo}</div>
                            <div class="font-xs text-muted">${inc.descripcion}</div>
                        </td>
                        <td><span class="badge ${sevClass}">${inc.severidad}</span></td>
                        <td><span class="badge ${inc.estado === 'abierto' ? 'badge-warning' : 'badge-success'}">${inc.estado}</span></td>
                        <td>
                            ${inc.estado === 'abierto' ? `<button class="button button-outline font-xs p-1" onclick="cerrarIncidente(${inc.id})">Cerrar</button>` : '-'}
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

        // El backend lo acepta como NULL, no es requerido.
        delete data.linea_ejecucion_id;

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

    cargarIncidentes();
});
