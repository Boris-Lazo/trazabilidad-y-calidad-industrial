
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bitacoraId = urlParams.get('id');
    const maquinaId = urlParams.get('maquina');
    const codigoMaquina = urlParams.get('codigo');

    if (!bitacoraId || !maquinaId) {
        window.location.href = 'bitacora.html';
        return;
    }

    document.getElementById('label-maquina').textContent = codigoMaquina;
    document.getElementById('title-maquina').textContent = `Registro de Telar ${codigoMaquina}`;
    document.getElementById('link-resumen').href = `telares_resumen.html?id=${bitacoraId}`;

    let orders = [];
    let paroTipos = [];
    let nominalAncho = 0;

    async function init() {
        await Promise.all([
            fetchOrders(),
            fetchParoTipos(),
            loadData()
        ]);
    }

    async function fetchOrders() {
        const res = await fetch('/api/ordenes-produccion?estado=Liberada&proceso_id=2');
        const result = await res.json();
        orders = result.data || [];
    }

    async function fetchParoTipos() {
        const res = await fetch('/api/telares/paro-tipos');
        const result = await res.json();
        paroTipos = result.data || [];
    }

    async function loadData() {
        try {
            const res = await fetch(`/api/telares/detalle/${maquinaId}?bitacora_id=${bitacoraId}`);
            const result = await res.json();
            if (result.success) {
                renderData(result.data);
            }
        } catch (error) {
            console.error('Error cargando detalle:', error);
        }
    }

    function renderData(data) {
        document.getElementById('select-estado').value = (data.estado === 'Con desviación') ? 'Completo' : data.estado;
        document.getElementById('obs-advertencia').value = data.observacion_advertencia || '';

        // Producción
        const tbodyProd = document.getElementById('tbody-produccion');
        tbodyProd.innerHTML = '';
        data.produccion.forEach(p => agregarFilaProduccion(p));
        if (data.produccion.length === 0) agregarFilaProduccion();

        // Actualizar ancho nominal basado en la última orden
        if (data.produccion.length > 0 && data.produccion[0].especificaciones) {
            nominalAncho = data.produccion[0].especificaciones.ancho_nominal || 0;
            document.getElementById('ancho-nominal').textContent = nominalAncho;
        }

        // Calidad Ancho
        const tbodyAncho = document.getElementById('tbody-ancho');
        tbodyAncho.innerHTML = '';
        data.calidad.ancho.forEach(a => agregarFilaAncho(a));

        // Calidad Visual
        const tbodyVisual = document.getElementById('tbody-visual');
        tbodyVisual.innerHTML = '';
        data.calidad.visual.forEach(v => agregarFilaVisual(v));

        // Incidentes
        const tbodyInc = document.getElementById('tbody-incidentes');
        tbodyInc.innerHTML = '';
        data.incidentes.forEach(i => {
             // Parsear descripción simple
             const tiempoMatch = i.descripcion.match(/Tiempo: (\d+)/);
             const motivoParts = i.descripcion.split('min. ');
             agregarFilaIncidente({
                tiempo: tiempoMatch ? tiempoMatch[1] : '',
                clasificacion: i.titulo.split(':')[0],
                motivo: motivoParts.length > 1 ? motivoParts[1] : i.descripcion
            });
        });
    }

    function agregarFilaProduccion(data = {}) {
        const tr = document.createElement('tr');
        const options = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden}</option>`).join('');

        tr.innerHTML = `
            <td><select class="form-control select-orden">${options}</select></td>
            <td><input type="number" class="form-control input-cantidad" value="${data.cantidad || ''}"></td>
            <td><input type="number" class="form-control input-desperdicio" value="${data.desperdicio || ''}"></td>
            <td><input type="text" class="form-control input-obs" value="${data.observaciones || ''}"></td>
            <td><button class="button button-outline btn-del" style="color:var(--danger)">×</button></td>
        `;

        tr.querySelector('.select-orden').addEventListener('change', (e) => {
            const orderId = e.target.value;
            const order = orders.find(o => o.id == orderId);
            if (order && order.especificaciones) {
                const specs = typeof order.especificaciones === 'string' ? JSON.parse(order.especificaciones) : order.especificaciones;
                nominalAncho = specs.ancho_nominal || 0;
                document.getElementById('ancho-nominal').textContent = nominalAncho;
            }
        });

        tr.querySelector('.btn-del').addEventListener('click', () => tr.remove());
        document.getElementById('tbody-produccion').appendChild(tr);
    }

    function agregarFilaAncho(data = {}) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" step="0.01" class="form-control input-ancho-valor" value="${data.valor || ''}"></td>
            <td class="td-resultado">${data.resultado || '--'}</td>
            <td><button class="button button-outline btn-del" style="color:var(--danger)">×</button></td>
        `;

        const input = tr.querySelector('.input-ancho-valor');
        const updateResult = () => {
            const val = parseFloat(input.value);
            const resTd = tr.querySelector('.td-resultado');
            if (isNaN(val) || !nominalAncho) {
                resTd.textContent = '--';
                return;
            }
            const diff = Math.abs(val - nominalAncho);
            if (diff <= 0.25) {
                resTd.textContent = 'Cumple';
                resTd.style.color = 'var(--success)';
            } else {
                resTd.textContent = 'No cumple';
                resTd.style.color = 'var(--danger)';
            }
        };

        input.addEventListener('input', updateResult);
        if (data.valor) updateResult();

        tr.querySelector('.btn-del').addEventListener('click', () => tr.remove());
        document.getElementById('tbody-ancho').appendChild(tr);
    }

    function agregarFilaVisual(data = {}) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="form-control input-rollo" value="${data.rollo_numero || ''}"></td>
            <td><input type="text" class="form-control input-defecto" value="${data.tipo_defecto || ''}"></td>
            <td><input type="text" class="form-control input-obs-visual" value="${data.observacion || ''}"></td>
            <td><button class="button button-outline btn-del" style="color:var(--danger)">×</button></td>
        `;
        tr.querySelector('.btn-del').addEventListener('click', () => tr.remove());
        document.getElementById('tbody-visual').appendChild(tr);
    }

    function agregarFilaIncidente(data = {}) {
        const tr = document.createElement('tr');
        const options = paroTipos.map(t => `<option value="${t.nombre}" ${data.clasificacion == t.nombre ? 'selected' : ''}>${t.nombre}</option>`).join('');

        tr.innerHTML = `
            <td><input type="number" class="form-control input-tiempo" value="${data.tiempo || ''}"></td>
            <td><select class="form-control select-paro">${options}</select></td>
            <td><input type="text" class="form-control input-motivo" value="${data.motivo || ''}"></td>
            <td><button class="button button-outline btn-del" style="color:var(--danger)">×</button></td>
        `;
        tr.querySelector('.btn-del').addEventListener('click', () => tr.remove());
        document.getElementById('tbody-incidentes').appendChild(tr);
    }

    // Event listeners
    document.getElementById('btn-agregar-produccion').addEventListener('click', () => agregarFilaProduccion());
    document.getElementById('btn-agregar-ancho').addEventListener('click', () => agregarFilaAncho());
    document.getElementById('btn-agregar-visual').addEventListener('click', () => agregarFilaVisual());
    document.getElementById('btn-agregar-incidente').addEventListener('click', () => agregarFilaIncidente());

    document.getElementById('btn-volver').addEventListener('click', () => {
        window.location.href = `telares_resumen.html?id=${bitacoraId}`;
    });

    document.getElementById('btn-guardar').addEventListener('click', async () => {
        const estado = document.getElementById('select-estado').value;

        const produccion = Array.from(document.querySelectorAll('#tbody-produccion tr')).map(tr => ({
            orden_id: tr.querySelector('.select-orden').value,
            cantidad: parseFloat(tr.querySelector('.input-cantidad').value) || 0,
            desperdicio: parseFloat(tr.querySelector('.input-desperdicio').value) || 0,
            observaciones: tr.querySelector('.input-obs').value
        }));

        const calidadAncho = Array.from(document.querySelectorAll('#tbody-ancho tr')).map(tr => ({
            valor: parseFloat(tr.querySelector('.input-ancho-valor').value),
            resultado: tr.querySelector('.td-resultado').textContent,
            valor_nominal: nominalAncho
        })).filter(a => !isNaN(a.valor));

        const calidadVisual = Array.from(document.querySelectorAll('#tbody-visual tr')).map(tr => ({
            rollo_numero: parseInt(tr.querySelector('.input-rollo').value),
            tipo_defecto: tr.querySelector('.input-defecto').value,
            observacion: tr.querySelector('.input-obs-visual').value,
            orden_id: produccion.length > 0 ? produccion[0].orden_id : null
        })).filter(v => v.rollo_numero && v.tipo_defecto);

        const incidentes = Array.from(document.querySelectorAll('#tbody-incidentes tr')).map(tr => ({
            tiempo: parseInt(tr.querySelector('.input-tiempo').value),
            clasificacion: tr.querySelector('.select-paro').value,
            motivo: tr.querySelector('.input-motivo').value
        })).filter(i => i.tiempo && i.motivo);

        // Validaciones Frontend
        let hasDeviation = calidadAncho.some(a => a.resultado !== 'Cumple');

        if (estado === 'Completo' && calidadAncho.length === 0) {
            document.getElementById('aviso-calidad').style.display = 'block';
            if (!document.getElementById('obs-advertencia').value.trim()) {
                alert('Debe proporcionar una explicación si no hay datos de calidad para un registro completo.');
                return;
            }
        }

        const payload = {
            bitacora_id: parseInt(bitacoraId),
            maquina_id: parseInt(maquinaId),
            estado,
            produccion,
            calidad: {
                ancho: calidadAncho,
                visual: calidadVisual
            },
            incidentes,
            observacion_advertencia: document.getElementById('obs-advertencia').value
        };

        try {
            const res = await fetch('/api/telares/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Datos guardados correctamente');
                window.location.href = `telares_resumen.html?id=${bitacoraId}`;
            } else {
                const err = await res.json();
                alert('Error al guardar: ' + (err.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error guardando:', error);
            alert('Error de conexión');
        }
    });

    init();
});
