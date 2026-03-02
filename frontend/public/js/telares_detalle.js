
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
    let lotesDisponibles = [];
    let paroTipos = [];
    let currentSpecs = {
        ancho_nominal: null,
        construccion_urdido: null,
        construccion_trama: null,
        color_urdido: null,
        color_trama: null
    };
    let baseAcumulado = 0;

    async function init() {
        try {
            const [ordersRes, parosRes, detailRes, lotesRes] = await Promise.all([
                fetch('/api/ordenes-produccion?estado=Liberada&proceso_id=2').then(r => r.json()),
                fetch('/api/telares/paro-tipos').then(r => r.json()),
                fetch(`/api/telares/detalle/${maquinaId}?bitacora_id=${bitacoraId}`).then(r => r.json()),
                fetch('/api/lotes').then(r => r.json())
            ]);

            orders = ordersRes.data || [];
            paroTipos = parosRes.data || [];
            lotesDisponibles = lotesRes.data || [];

            if (detailRes.success) {
                renderData(detailRes.data);
            }
        } catch (error) {
            console.error('Error initialization:', error);
            alert('Error al cargar datos iniciales');
        }
    }

    function renderData(data) {
        baseAcumulado = data.ultimoAcumulado || 0;
        document.getElementById('val-ultimo-acumulado').textContent = `${baseAcumulado} m`;

        if (data.especificaciones_orden) {
            updateSpecs(data.especificaciones_orden);
        }

        // Produccion
        const tbodyProd = document.getElementById('tbody-produccion');
        tbodyProd.innerHTML = '';
        data.produccion.forEach(p => agregarFilaProduccion(p));
        if (data.produccion.length === 0) agregarFilaProduccion();

        // Calidad Ancho
        data.calidad.ancho.forEach(a => {
            const tr = document.querySelector(`#tbody-ancho tr[data-indice="${a.indice}"]`);
            if (tr) {
                const input = tr.querySelector('.input-ancho');
                input.value = a.valor;
                updateAnchoResult(tr);
            }
        });

        // Calidad Construccion
        data.calidad.construccion.forEach(c => {
            const tr = document.querySelector(`#tbody-construccion tr[data-param="${c.parametro}"]`);
            if (tr) {
                const input = tr.querySelector('.input-const');
                input.value = c.valor;
                updateConstruccionResult(tr);
            }
        });

        // Verificacion Color
        data.calidad.color.forEach(c => {
            const tr = document.querySelector(`#tbody-color tr[data-param="${c.parametro}"]`);
            if (tr) {
                tr.querySelector('.select-color').value = c.resultado;
            }
        });

        // Visual
        data.visual.forEach(v => agregarFilaVisual(v));

        // Paros
        data.paros.forEach(p => agregarFilaParo(p));

        // Lotes consumidos
        document.getElementById('tbody-lotes-consumidos').innerHTML = '';
        if (data.lotes_consumidos && data.lotes_consumidos.length > 0) {
            data.lotes_consumidos.forEach(lc => agregarFilaLote(lc));
        }

        document.getElementById('input-justificacion').value = data.observacion_advertencia || '';

        recalculateAll();
    }

    function updateSpecs(specs) {
        currentSpecs = { ...currentSpecs, ...specs };
        document.getElementById('val-ancho-nominal').textContent = specs.ancho_nominal ? `${specs.ancho_nominal}"` : '--';
        document.getElementById('val-construccion').textContent = (specs.construccion_urdido && specs.construccion_trama)
            ? `${specs.construccion_urdido} x ${specs.construccion_trama}` : '--';
        document.getElementById('val-color').textContent = (specs.color_urdido && specs.color_trama)
            ? `${specs.color_urdido} / ${specs.color_trama}` : '--';

        // Update Quality Sections with nominals
        document.querySelectorAll('.nom-const').forEach(td => {
            const param = td.parentElement.dataset.param;
            td.textContent = specs[param] || '--';
        });
        document.querySelectorAll('.exp-color').forEach(td => {
            const param = td.parentElement.dataset.param;
            td.textContent = specs[param] || '--';
        });

        // Re-evaluate quality results with new nominals
        document.querySelectorAll('#tbody-ancho tr').forEach(tr => updateAnchoResult(tr));
        document.querySelectorAll('#tbody-construccion tr').forEach(tr => updateConstruccionResult(tr));
    }

    function agregarFilaProduccion(data = {}) {
        const tr = document.createElement('tr');
        const options = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden}</option>`).join('');

        tr.innerHTML = `
            <td><select class="select-orden"><option value="">Seleccione Orden...</option>${options}</select></td>
            <td><input type="number" class="input-acumulado" value="${data.acumulado_contador || ''}"></td>
            <td class="res-metros">0</td>
            <td><input type="number" step="0.1" class="input-desperdicio" value="${data.desperdicio_kg || ''}"></td>
            <td><input type="text" class="input-obs" value="${data.observaciones || ''}"></td>
            <td><button class="button button-outline btn-del" title="Eliminar">×</button></td>
        `;

        tr.querySelector('.select-orden').addEventListener('change', (e) => {
            const orderId = e.target.value;
            const order = orders.find(o => o.id == orderId);
            if (order && order.especificaciones) {
                const specs = typeof order.especificaciones === 'string' ? JSON.parse(order.especificaciones) : order.especificaciones;
                updateSpecs(specs);
            }
            recalculateAll();
        });

        tr.querySelector('.input-acumulado').addEventListener('input', () => recalculateAll());
        tr.querySelector('.btn-del').addEventListener('click', () => { tr.remove(); recalculateAll(); });

        document.getElementById('tbody-produccion').appendChild(tr);
    }

    function updateAnchoResult(tr) {
        const val = parseFloat(tr.querySelector('.input-ancho').value);
        const resTd = tr.querySelector('.res-ancho');
        const nominal = currentSpecs.ancho_nominal;

        if (isNaN(val) || nominal === null) {
            resTd.textContent = '--';
            resTd.className = 'res-ancho';
            return;
        }

        const ok = Math.abs(val - nominal) <= 0.25;
        resTd.textContent = ok ? 'Cumple' : 'No cumple';
        resTd.style.color = ok ? 'var(--success)' : 'var(--danger)';
        resTd.style.fontWeight = 'bold';
    }

    function updateConstruccionResult(tr) {
        const val = parseInt(tr.querySelector('.input-const').value);
        const resTd = tr.querySelector('.res-const');
        const param = tr.dataset.param;
        const nominal = currentSpecs[param];

        if (isNaN(val) || nominal === null) {
            resTd.textContent = '--';
            return;
        }

        const ok = val === parseInt(nominal);
        resTd.textContent = ok ? 'Cumple' : 'No cumple';
        resTd.style.color = ok ? 'var(--success)' : 'var(--danger)';
    }

    function agregarFilaLote(data = {}) {
        const tr = document.createElement('tr');
        const options = lotesDisponibles
            .map(l => `<option value="${l.id}" ${data.lote_id == l.id ? 'selected' : ''}>${l.codigo_lote} — ${l.codigo_orden || ''}</option>`)
            .join('');

        tr.innerHTML = `
            <td>
                <select class="select-lote">
                    <option value="">Seleccione lote...</option>
                    ${options}
                </select>
            </td>
            <td class="td-codigo-lote">${data.codigo_lote || '--'}</td>
            <td class="td-orden-lote">${data.codigo_orden || '--'}</td>
            <td>
                <button class="button button-outline btn-del" title="Eliminar">×</button>
            </td>
        `;

        tr.querySelector('.select-lote').addEventListener('change', (e) => {
            const lote = lotesDisponibles.find(l => l.id == e.target.value);
            tr.querySelector('.td-codigo-lote').textContent = lote ? lote.codigo_lote : '--';
            tr.querySelector('.td-orden-lote').textContent = lote ? (lote.codigo_orden || '--') : '--';
        });

        tr.querySelector('.btn-del').addEventListener('click', () => tr.remove());
        document.getElementById('tbody-lotes-consumidos').appendChild(tr);
    }

    function agregarFilaVisual(data = {}) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="input-rollo-num" value="${data.rollo_numero || ''}"></td>
            <td class="display-rollo">--</td>
            <td>
                <select class="select-defecto">
                    <option value="">Seleccione...</option>
                    <option value="DEF-01" ${data.tipo_defecto_id === 'DEF-01' ? 'selected' : ''}>DEF-01 Cintas incorrectas</option>
                    <option value="DEF-02" ${data.tipo_defecto_id === 'DEF-02' ? 'selected' : ''}>DEF-02 Tela picada</option>
                    <option value="DEF-03" ${data.tipo_defecto_id === 'DEF-03' ? 'selected' : ''}>DEF-03 Rollo mal embobinado</option>
                </select>
            </td>
            <td><input type="text" class="input-obs-visual" value="${data.observacion || ''}"></td>
            <td><button class="button button-outline btn-del">×</button></td>
        `;

        const inputNum = tr.querySelector('.input-rollo-num');
        const display = tr.querySelector('.display-rollo');
        const updateDisplay = () => {
            display.textContent = inputNum.value ? `${inputNum.value}-${codigoMaquina}` : '--';
        };
        inputNum.addEventListener('input', updateDisplay);
        updateDisplay();

        tr.querySelector('.btn-del').addEventListener('click', () => tr.remove());
        document.getElementById('tbody-visual').appendChild(tr);
    }

    function agregarFilaParo(data = {}) {
        const tr = document.createElement('tr');
        const options = paroTipos.map(t => `<option value="${t.id}" ${data.motivo_id == t.id ? 'selected' : ''}>${t.nombre}</option>`).join('');

        tr.innerHTML = `
            <td><select class="select-paro-tipo"><option value="">Seleccione...</option>${options}</select></td>
            <td><input type="number" class="input-minutos" value="${data.minutos_perdidos || ''}"></td>
            <td><input type="text" class="input-justificacion-paro" value="${data.observacion || ''}"></td>
            <td><button class="button button-outline btn-del">×</button></td>
        `;
        tr.querySelector('.btn-del').addEventListener('click', () => { tr.remove(); recalculateAll(); });
        tr.querySelector('.input-minutos').addEventListener('input', () => recalculateAll());
        document.getElementById('tbody-paros').appendChild(tr);
    }

    function recalculateAll() {
        // Recalcular metros producidos
        let prevAcumulado = baseAcumulado;
        let totalMetros = 0;
        document.querySelectorAll('#tbody-produccion tr').forEach(tr => {
            const current = parseInt(tr.querySelector('.input-acumulado').value) || 0;
            const diff = current - prevAcumulado;
            const resTd = tr.querySelector('.res-metros');
            resTd.textContent = diff;
            resTd.style.color = diff < 0 ? 'var(--danger)' : 'inherit';
            totalMetros += (diff > 0 ? diff : 0);
            prevAcumulado = current;
        });

        // Visibilidad de justificación
        const anchosValidos = Array.from(document.querySelectorAll('.input-ancho')).filter(i => i.value.trim() !== '').length;
        document.getElementById('section-justificacion').style.display = (anchosValidos > 0 && anchosValidos < 4) ? 'block' : 'none';

        // Alerta color
        const colorNoCumple = Array.from(document.querySelectorAll('.select-color')).some(s => s.value === 'No cumple');
        document.getElementById('alert-color-fail').style.display = colorNoCumple ? 'block' : 'none';

        // Badge de estado
        updateStatusBadge(anchosValidos, colorNoCumple, totalMetros);
    }

    function updateStatusBadge(anchosCount, colorFail, totalMetros) {
        const badge = document.getElementById('badge-estado');
        const parosCount = document.querySelectorAll('#tbody-paros tr').length;
        const constrCount = Array.from(document.querySelectorAll('.input-const')).filter(i => i.value.trim() !== '').length;
        const colorsCount = Array.from(document.querySelectorAll('.select-color')).filter(s => s.value !== '').length;

        const anchoFail = Array.from(document.querySelectorAll('.res-ancho')).some(td => td.textContent === 'No cumple');
        const justif = document.getElementById('input-justificacion').value.trim().length > 0;

        let estado = 'Sin datos';
        let clase = 'status-sin-datos';

        const hasData = totalMetros > 0 || parosCount > 0 || anchosCount > 0 || constrCount > 0 || colorsCount > 0;

        if (hasData) {
            estado = 'Parcial';
            clase = 'status-parcial';

            const completo = (totalMetros > 0 || parosCount > 0) &&
                             (anchosCount >= 4 || (anchosCount > 0 && justif)) &&
                             (constrCount === 2) &&
                             (colorsCount === 2);

            if (completo) {
                estado = 'Completo';
                clase = 'status-completo';
            }

            if (anchoFail || colorFail) {
                estado = 'Con desviación';
                clase = 'status-desviacion';
            }
        }

        badge.textContent = estado;
        badge.className = `badge-status ${clase}`;
    }

    // Handlers
    document.getElementById('btn-agregar-produccion').addEventListener('click', () => agregarFilaProduccion());
    document.getElementById('btn-agregar-visual').addEventListener('click', () => agregarFilaVisual());
    document.getElementById('btn-agregar-paro').addEventListener('click', () => agregarFilaParo());
    document.getElementById('btn-agregar-lote').addEventListener('click', () => agregarFilaLote());

    document.querySelectorAll('.input-ancho').forEach(input => {
        input.addEventListener('input', (e) => {
            updateAnchoResult(e.target.closest('tr'));
            recalculateAll();
        });
    });

    document.querySelectorAll('.input-const').forEach(input => {
        input.addEventListener('input', (e) => {
            updateConstruccionResult(e.target.closest('tr'));
            recalculateAll();
        });
    });

    document.querySelectorAll('.select-color').forEach(select => {
        select.addEventListener('change', () => {
            if (select.value === 'No cumple') {
                document.getElementById('alert-color-fail').scrollIntoView({ behavior: 'smooth' });
            }
            recalculateAll();
        });
    });

    document.getElementById('input-justificacion').addEventListener('input', () => recalculateAll());

    document.getElementById('btn-volver').addEventListener('click', () => {
        window.location.href = `telares_resumen.html?id=${bitacoraId}`;
    });

    document.getElementById('btn-guardar').addEventListener('click', async () => {
        // Validaciones Frontend
        const prodRows = document.querySelectorAll('#tbody-produccion tr');
        const produccion = [];
        let validProd = true;
        let lastAcum = baseAcumulado;

        prodRows.forEach(tr => {
            const orden_id = tr.querySelector('.select-orden').value;
            const acumulado = parseInt(tr.querySelector('.input-acumulado').value);
            if (!orden_id || isNaN(acumulado)) {
                validProd = false;
                return;
            }
            if (acumulado < lastAcum) {
                alert(`Error: El acumulado (${acumulado}) no puede ser menor al anterior (${lastAcum}).`);
                validProd = false;
            }
            produccion.push({
                orden_id,
                acumulado_contador: acumulado,
                desperdicio_kg: parseFloat(tr.querySelector('.input-desperdicio').value) || 0,
                observaciones: tr.querySelector('.input-obs').value
            });
            lastAcum = acumulado;
        });

        if (!validProd) return;

        const lotes_consumidos = Array.from(
            document.querySelectorAll('#tbody-lotes-consumidos tr')
        )
            .map(tr => ({ lote_id: parseInt(tr.querySelector('.select-lote').value) }))
            .filter(lc => !isNaN(lc.lote_id) && lc.lote_id > 0);

        const paros = Array.from(document.querySelectorAll('#tbody-paros tr')).map(tr => ({
            motivo_id: parseInt(tr.querySelector('.select-paro-tipo').value),
            minutos_perdidos: parseInt(tr.querySelector('.input-minutos').value),
            observacion: tr.querySelector('.input-justificacion-paro').value
        })).filter(p => p.motivo_id && !isNaN(p.minutos_perdidos));

        for (const p of paros) {
            if (p.minutos_perdidos <= 0) { alert('Los minutos de paro deben ser mayores a 0.'); return; }
            if (!p.observacion || p.observacion.trim().length < 10) {
                alert('La justificación del paro debe tener al menos 10 caracteres.');
                return;
            }
        }

        const metrosTotales = produccion.reduce((acc, p, i) => {
            const ant = (i === 0) ? baseAcumulado : produccion[i-1].acumulado_contador;
            return acc + (p.acumulado_contador - ant);
        }, 0);

        if (metrosTotales > 0 && lotes_consumidos.length === 0) {
            alert('Debe declarar al menos un lote consumido cuando hay producción registrada.');
            return;
        }

        if (metrosTotales === 0 && paros.length === 0) {
            alert('Debe registrar al menos un paro si no hubo producción.');
            return;
        }

        const anchoMuestras = Array.from(document.querySelectorAll('#tbody-ancho tr')).map(tr => ({
            indice: parseInt(tr.dataset.indice),
            valor: parseFloat(tr.querySelector('.input-ancho').value),
            resultado: tr.querySelector('.res-ancho').textContent,
            valor_nominal: currentSpecs.ancho_nominal
        })).filter(a => !isNaN(a.valor));

        if (anchoMuestras.length > 0 && anchoMuestras.length < 4 && !document.getElementById('input-justificacion').value.trim()) {
            alert('Debe justificar por qué hay menos de 4 mediciones de ancho.');
            return;
        }

        const constMuestras = Array.from(document.querySelectorAll('#tbody-construccion tr')).map(tr => ({
            parametro: tr.dataset.param,
            valor: parseInt(tr.querySelector('.input-const').value),
            resultado: tr.querySelector('.res-const').textContent,
            valor_nominal: currentSpecs[tr.dataset.param]
        })).filter(c => !isNaN(c.valor));

        const colorMuestras = Array.from(document.querySelectorAll('#tbody-color tr')).map(tr => ({
            parametro: tr.dataset.param,
            resultado: tr.querySelector('.select-color').value,
            valor_nominal: currentSpecs[tr.dataset.param]
        })).filter(c => c.resultado !== '');

        if (colorMuestras.some(c => c.resultado === 'No cumple') && paros.length === 0) {
            alert('Un color fuera de especificación obliga a registrar un paro.');
            return;
        }

        const visual = Array.from(document.querySelectorAll('#tbody-visual tr')).map(tr => ({
            rollo_numero: parseInt(tr.querySelector('.input-rollo-num').value),
            tipo_defecto_id: tr.querySelector('.select-defecto').value,
            observacion: tr.querySelector('.input-obs-visual').value,
            orden_id: produccion.length > 0 ? produccion[0].orden_id : null
        })).filter(v => v.rollo_numero && v.tipo_defecto_id);

        for (const v of visual) {
            if (v.observacion.trim().length < 10) { alert('La observación del defecto visual debe tener al menos 10 caracteres.'); return; }
        }

        const payload = {
            bitacora_id: parseInt(bitacoraId),
            maquina_id: parseInt(maquinaId),
            produccion,
            calidad: {
                ancho: anchoMuestras,
                construccion: constMuestras,
                color: colorMuestras
            },
            visual,
            paros,
            lotes_consumidos,
            observacion_advertencia: document.getElementById('input-justificacion').value
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
                alert('Error al guardar: ' + (err.error || err.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error de conexión al guardar');
        }
    });

    init();
});
