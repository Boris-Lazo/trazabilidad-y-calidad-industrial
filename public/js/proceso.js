
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const procesoId = urlParams.get('id');
    const procesoNombre = urlParams.get('nombre');

    if (!procesoId) {
        window.location.href = '/bitacora.html';
        return;
    }

    document.getElementById('proceso-titulo').textContent = `Proceso: ${procesoNombre}`;
    document.getElementById('bread-proceso').textContent = procesoNombre;

    let currentBitacora = null;
    let orders = [];

    // Cargar datos iniciales
    try {
        const [bitacoraRes, ordersRes] = await Promise.all([
            fetch('/api/bitacora/estado'),
            fetch('/api/ordenes-produccion')
        ]);

        const bitacoraData = await bitacoraRes.json();
        if (!bitacoraData.abierta && !bitacoraData.bitacora) {
            // Si no hay bitácora ni abierta ni cerrada con ese ID, volvemos
            // En realidad, 'estado' solo devuelve la abierta.
            // Necesitamos saber si estamos viendo una cerrada.
        }

        currentBitacora = bitacoraData.bitacora;

        // Si no hay abierta, intentar cargar por ID si fuera necesario (para 'Ver' histórico)
        // Por ahora, asumimos que trabajamos sobre la abierta.

        document.getElementById('bread-turno').textContent = currentBitacora.turno;
        document.getElementById('bread-fecha').textContent = currentBitacora.fecha_operativa;

        orders = await ordersRes.json();

        // Cargar datos específicos del proceso
        await cargarDatosExistentes();

    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }

    async function cargarDatosExistentes() {
        const res = await fetch(`/api/bitacora/proceso-data?bitacora_id=${currentBitacora.id}&proceso_id=${procesoId}`);
        const data = await res.json();

        if (data.no_operativo) {
            document.getElementById('select-operatividad').value = 'no_operativo';
            document.getElementById('group-motivo').style.display = 'block';
            document.getElementById('motivo-no-operativo').value = data.motivo_no_operativo;
            document.getElementById('secciones-operativas').style.display = 'none';
        }

        data.muestras.forEach(m => agregarMuestra(m));
        data.produccion.forEach(p => agregarProduccion(p));
        data.desperdicio.forEach(d => agregarDesperdicio(d));
        document.getElementById('observaciones').value = data.observaciones || '';

        if (data.solo_lectura) {
            document.querySelectorAll('input, select, textarea, button').forEach(el => {
                if (el.id !== 'btn-volver') el.disabled = true;
            });
            // Ocultar botones de guardado
            document.getElementById('btn-guardar').style.display = 'none';
            document.getElementById('btn-guardar-volver').style.display = 'none';
        }
    }

    // Manejo de operatividad
    document.getElementById('select-operatividad').addEventListener('change', (e) => {
        const isNoOperativo = e.target.value === 'no_operativo';
        document.getElementById('group-motivo').style.display = isNoOperativo ? 'block' : 'none';
        document.getElementById('secciones-operativas').style.display = isNoOperativo ? 'none' : 'block';
    });

    // Funciones para agregar filas
    function agregarMuestra(data = {}) {
        const tbody = document.getElementById('tbody-calidad');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form__input" placeholder="Parámetro" value="${data.parametro || ''}"></td>
            <td><input type="number" class="form__input" placeholder="Valor" value="${data.valor || ''}"></td>
            <td>
                <select class="form__input select-resultado">
                    <option value="Aceptable" ${data.resultado === 'Aceptable' ? 'selected' : ''}>✔ Aceptable</option>
                    <option value="En espera" ${data.resultado === 'En espera' ? 'selected' : ''}>⚠ En espera</option>
                    <option value="Rechazo" ${data.resultado === 'Rechazo' ? 'selected' : ''}>✖ Rechazo</option>
                </select>
            </td>
            <td><button class="button button-outline btn-eliminar-fila" style="color: var(--danger);">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.select-resultado').addEventListener('change', checkObservacionesObligatorias);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
    };

    function agregarProduccion(data = {}) {
        const tbody = document.getElementById('tbody-produccion');
        const tr = document.createElement('tr');
        const orderOptions = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden} - ${o.producto}</option>`).join('');
        tr.innerHTML = `
            <td><input type="text" class="form__input" placeholder="Máquina" value="${data.maquina || ''}"></td>
            <td><select class="form__input">${orderOptions}</select></td>
            <td><input type="number" class="form__input" placeholder="Cantidad" value="${data.cantidad || ''}"></td>
            <td><input type="text" class="form__input" placeholder="Unidad" value="${data.unidad || 'm'}"></td>
            <td><button class="button button-outline btn-eliminar-fila" style="color: var(--danger);">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
    };

    function agregarDesperdicio(data = {}) {
        const tbody = document.getElementById('tbody-desperdicio');
        const tr = document.createElement('tr');
        const orderOptions = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden}</option>`).join('');
        tr.innerHTML = `
            <td><input type="text" class="form__input" placeholder="Máquina" value="${data.maquina || ''}"></td>
            <td><select class="form__input">${orderOptions}</select></td>
            <td><input type="number" class="form__input" placeholder="Kg" value="${data.kg || ''}"></td>
            <td><button class="button button-outline btn-eliminar-fila" style="color: var(--danger);">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
    };

    document.getElementById('btn-agregar-muestra').addEventListener('click', () => agregarMuestra());
    document.getElementById('btn-agregar-produccion').addEventListener('click', () => agregarProduccion());
    document.getElementById('btn-agregar-desperdicio').addEventListener('click', () => agregarDesperdicio());

    function checkObservacionesObligatorias() {
        const resultados = Array.from(document.querySelectorAll('.select-resultado')).map(s => s.value);
        const hasProblem = resultados.some(r => r === 'Rechazo' || r === 'En espera');
        const aviso = document.getElementById('aviso-obligatorio');
        aviso.style.display = hasProblem ? 'block' : 'none';
        return hasProblem;
    }

    async function guardar(volver = false) {
        const isNoOperativo = document.getElementById('select-operatividad').value === 'no_operativo';
        const motivoNoOperativo = document.getElementById('motivo-no-operativo').value;

        if (isNoOperativo && !motivoNoOperativo.trim()) {
            alert('Debe indicar el motivo por el cual el proceso no es operativo.');
            return;
        }

        let data = {
            bitacora_id: currentBitacora.id,
            proceso_id: procesoId,
            no_operativo: isNoOperativo,
            motivo_no_operativo: motivoNoOperativo
        };

        if (!isNoOperativo) {
            const muestras = Array.from(document.getElementById('tbody-calidad').querySelectorAll('tr')).map(tr => {
                const inputs = tr.querySelectorAll('input, select');
                return {
                    parametro: inputs[0].value,
                    valor: inputs[1].value,
                    resultado: inputs[2].value
                };
            });

            const produccion = Array.from(document.getElementById('tbody-produccion').querySelectorAll('tr')).map(tr => {
                const inputs = tr.querySelectorAll('input, select');
                return {
                    maquina: inputs[0].value,
                    orden_id: inputs[1].value,
                    cantidad: inputs[2].value,
                    unidad: inputs[3].value
                };
            });

            const desperdicio = Array.from(document.getElementById('tbody-desperdicio').querySelectorAll('tr')).map(tr => {
                const inputs = tr.querySelectorAll('input, select');
                return {
                    maquina: inputs[0].value,
                    orden_id: inputs[1].value,
                    kg: inputs[2].value
                };
            });

            const observaciones = document.getElementById('observaciones').value;

            if (checkObservacionesObligatorias() && !observaciones.trim()) {
                alert('Las observaciones son obligatorias si hay rechazos o desviaciones.');
                return;
            }

            data = {
                ...data,
                muestras,
                produccion,
                desperdicio,
                observaciones
            };
        }

        try {
            const response = await fetch('/api/bitacora/guardar-proceso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                if (volver) {
                    window.location.href = '/bitacora.html';
                } else {
                    alert('Datos guardados correctamente.');
                }
            } else {
                alert('Error al guardar datos.');
            }
        } catch (error) {
            console.error('Error guardando:', error);
        }
    }

    document.getElementById('btn-guardar').addEventListener('click', () => guardar(false));
    document.getElementById('btn-guardar-volver').addEventListener('click', () => guardar(true));

    // Cargar datos existentes si los hay (opcional para el MVP)
    // ...
});
