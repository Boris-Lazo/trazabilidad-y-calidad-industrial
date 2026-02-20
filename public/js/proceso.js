
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const procesoId = urlParams.get('id');
    const procesoNombre = urlParams.get('nombre');

    if (!procesoId) {
        window.location.href = '/bitacora.html';
        return;
    }

    const isExtrusorPP = procesoNombre === 'Extrusor PP';

    document.getElementById('proceso-titulo').textContent = `Proceso: ${procesoNombre}`;
    document.getElementById('bread-proceso').textContent = procesoNombre;

    // Configurar visibilidad de secciones
    if (isExtrusorPP) {
        document.querySelectorAll('.section-extrusor').forEach(el => el.style.display = 'block');
        document.getElementById('calidad-generico').style.display = 'none';

        // Inicializar Materias Primas (6 filas)
        const tbodyMezcla = document.getElementById('tbody-mezcla');
        for (let i = 0; i < 6; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="form__input input-mezcla-tipo" placeholder="Ej. PP"></td>
                <td><input type="text" class="form__input input-mezcla-marca" placeholder="Ej. Propilco"></td>
                <td><input type="text" class="form__input input-mezcla-lote" placeholder="Lote"></td>
                <td><input type="number" class="form__input input-mezcla-porcentaje" placeholder="0" step="0.1"></td>
            `;
            tbodyMezcla.appendChild(tr);
        }

        // Listeners para cálculos automáticos
        document.body.addEventListener('input', (e) => {
            if (e.target.classList.contains('input-mezcla-porcentaje')) {
                calcularTotalMezcla();
            }
            actualizarBadgeEstado();
        });

        document.body.addEventListener('change', (e) => {
            actualizarBadgeEstado();
        });

    } else {
        document.querySelectorAll('.section-extrusor').forEach(el => el.style.display = 'none');
        document.getElementById('calidad-generico').style.display = 'block';
    }

    let currentBitacora = null;
    let orders = [];

    // Cargar datos iniciales
    try {
        const [bitacoraRes, ordersRes] = await Promise.all([
            fetch('/api/bitacora/estado'),
            fetch('/api/ordenes-produccion')
        ]);

        const bitacoraData = await bitacoraRes.json();
        currentBitacora = bitacoraData.bitacora;

        document.getElementById('bread-turno').textContent = currentBitacora.turno;
        document.getElementById('bread-fecha').textContent = currentBitacora.fecha_operativa;

        orders = await ordersRes.json();

        // Cargar datos específicos del proceso
        await cargarDatosExistentes();

    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }

    async function cargarDatosExistentes() {
        try {
            const res = await fetch(`/api/bitacora/proceso-data?bitacora_id=${currentBitacora.id}&proceso_id=${procesoId}`);
            const data = await res.json();

            if (data.no_operativo) {
                document.getElementById('select-operatividad').value = 'no_operativo';
                document.getElementById('select-operatividad').dispatchEvent(new Event('change'));
                document.getElementById('motivo-no-operativo').value = data.motivo_no_operativo;
            }

            if (isExtrusorPP) {
                // Cargar muestras extrusor
                if (data.muestras && data.muestras.length > 0) {
                    // Agrupar muestras por algún identificador si fuera necesario,
                    // pero el backend devuelve la lista plana.
                    // Para Extrusor PP, asumimos que cada muestra tiene múltiples parámetros.
                    // Por ahora, si el backend devuelve parámetros individuales, los reconstruimos.
                    // O mejor, el backend debería devolver las muestras estructuradas.
                    // Como el backend actual es genérico, vamos a mapear.

                    // Reconstrucción simplificada: si hay parámetros como 'Denier', 'Resistencia', etc.
                    // Pero para el MVP, si el usuario acaba de entrar, estará vacío.
                    // Si ya hay datos, los cargamos.

                    // Agruparemos por 'codigo_muestra' si lo usamos, o por orden de inserción.
                    // TODO: Implementar carga estructurada para Extrusor PP
                    data.muestras_estructuradas?.forEach(m => agregarMuestraExtrusor(m));
                    if (!data.muestras_estructuradas || data.muestras_estructuradas.length === 0) {
                        // Si no hay estructuradas, intentar agregar 3 vacías por defecto si es nuevo
                        for(let i=0; i<3; i++) agregarMuestraExtrusor();
                    }
                } else {
                    for(let i=0; i<3; i++) agregarMuestraExtrusor();
                }

                // Cargar mezcla
                if (data.mezcla) {
                    const rows = document.querySelectorAll('#tbody-mezcla tr');
                    data.mezcla.forEach((m, i) => {
                        if (rows[i]) {
                            rows[i].querySelector('.input-mezcla-tipo').value = m.tipo || '';
                            rows[i].querySelector('.input-mezcla-marca').value = m.marca || '';
                            rows[i].querySelector('.input-mezcla-lote').value = m.lote || '';
                            rows[i].querySelector('.input-mezcla-porcentaje').value = m.porcentaje || '';
                        }
                    });
                    calcularTotalMezcla();
                }

                // Cargar Incidentes
                data.incidentes?.forEach(inc => agregarIncidente(inc));

            } else {
                data.muestras?.forEach(m => agregarMuestra(m));
            }

            data.produccion?.forEach(p => agregarProduccion(p));
            data.desperdicio?.forEach(d => agregarDesperdicio(d));
            document.getElementById('observaciones').value = data.observaciones || '';

            actualizarBadgeEstado();

            if (data.solo_lectura) {
                document.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (!el.classList.contains('button-outline') || el.id === 'btn-guardar') {
                         el.disabled = true;
                    }
                });
                document.getElementById('btn-guardar').style.display = 'none';
                document.getElementById('btn-guardar-volver').style.display = 'none';
            }
        } catch (e) {
            console.error("Error al cargar datos existentes:", e);
        }
    }

    // --- FUNCIONES AUXILIARES ---

    function actualizarBadgeEstado() {
        const isNoOperativo = document.getElementById('select-operatividad').value === 'no_operativo';
        const motivoNoOperativo = document.getElementById('motivo-no-operativo').value.trim();

        const tbodyCalidad = isExtrusorPP ? document.getElementById('tbody-calidad-extrusor') : document.getElementById('tbody-calidad');
        const numMuestras = isExtrusorPP ? (tbodyCalidad.children.length / 2) : tbodyCalidad.children.length;

        const hasRegistros = document.getElementById('tbody-produccion').children.length > 0;

        let hasRechazo = false;
        if (isExtrusorPP) {
            hasRechazo = Array.from(document.querySelectorAll('.select-estado')).some(s => s.value === 'Rechazado' || s.value === 'En espera');
        } else {
            hasRechazo = Array.from(document.querySelectorAll('.select-resultado')).some(s => s.value === 'Rechazo' || s.value === 'En espera');
        }

        const hasIncidente = document.getElementById('tbody-incidentes').children.length > 0;

        let estado = 'Sin datos';
        let badgeClass = 'badge-outline';

        if (hasRechazo || hasIncidente) {
            estado = 'Revisión';
            badgeClass = 'badge-error';
        } else if (isNoOperativo && motivoNoOperativo && numMuestras > 0) {
            estado = 'Completo';
            badgeClass = 'badge-success';
        } else if (!isNoOperativo && hasRegistros && numMuestras > 0) {
            estado = 'Completo';
            badgeClass = 'badge-success';
        } else if (hasRegistros || numMuestras > 0 || (isNoOperativo && motivoNoOperativo)) {
            estado = 'Parcial';
            badgeClass = 'badge-warning';
        }

        const badge = document.getElementById('badge-estado-proceso');
        if (badge) {
            badge.textContent = estado;
            badge.className = `badge ${badgeClass}`;
        }
    }

    function calcularTotalMezcla() {
        let total = 0;
        document.querySelectorAll('.input-mezcla-porcentaje').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        const display = document.getElementById('total-mezcla');
        display.textContent = `${total.toFixed(1)}%`;
        display.className = total === 100 ? 'text-success' : 'text-error';
        document.getElementById('warning-mezcla').style.display = (total > 0 && total !== 100) ? 'block' : 'none';
        return total;
    }

    function calcularVelocidadEmbobinadores(trParams) {
        const rpm = parseFloat(trParams.querySelector('.input-rpm-tornillo').value) || 0;
        const stretch = parseFloat(trParams.querySelector('.input-ratio-stretch').value) || 0;
        const velocidad = rpm * 0.5 * stretch;
        trParams.querySelector('.input-vel-embob').value = velocidad.toFixed(2);
    }

    // --- MANEJO DE FILAS ---

    function agregarMuestraExtrusor(data = {}) {
        const tbody = document.getElementById('tbody-calidad-extrusor');
        const tr = document.createElement('tr');
        const index = Math.floor(tbody.children.length / 2) + 1;
        tr.innerHTML = `
            <td>${index}</td>
            <td>
                <select class="form__input select-tipo-ronda">
                    <option value="Inicio" ${data.tipo_ronda === 'Inicio' ? 'selected' : ''}>Inicio</option>
                    <option value="Intermedia" ${data.tipo_ronda === 'Intermedia' ? 'selected' : '' || (!data.tipo_ronda && index > 1) ? 'selected' : ''}>Intermedia</option>
                    <option value="Final" ${data.tipo_ronda === 'Final' ? 'selected' : ''}>Final</option>
                    <option value="Evento" ${data.tipo_ronda === 'Evento' ? 'selected' : ''}>Evento</option>
                </select>
            </td>
            <td><input type="number" class="form__input input-denier" value="${data.denier || ''}" step="0.1"></td>
            <td><input type="number" class="form__input input-resistencia" value="${data.resistencia || ''}" step="0.1"></td>
            <td><input type="number" class="form__input input-elongacion" value="${data.elongacion || ''}" step="0.1"></td>
            <td><input type="number" class="form__input input-tenacidad" value="${data.tenacidad || ''}" readonly style="background: rgba(255,255,255,0.05);"></td>
            <td><input type="number" class="form__input input-ancho" value="${data.ancho || ''}" step="0.1"></td>
            <td>
                <select class="form__input select-color">
                    <option value="A" ${data.color === 'A' ? 'selected' : ''}>A</option>
                    <option value="B" ${data.color === 'B' ? 'selected' : ''}>B</option>
                    <option value="C" ${data.color === 'C' ? 'selected' : ''}>C</option>
                </select>
            </td>
            <td>
                <select class="form__input select-estado">
                    <option value="Aprobado" ${data.estado === 'Aprobado' ? 'selected' : ''}>Aprobado</option>
                    <option value="Rechazado" ${data.estado === 'Rechazado' ? 'selected' : ''}>Rechazado</option>
                    <option value="En espera" ${data.estado === 'En espera' ? 'selected' : ''}>En espera</option>
                </select>
            </td>
            <td><button class="button button-outline btn-toggle-params">⚙️</button></td>
            <td><button class="button button-outline btn-eliminar-fila" style="color: var(--danger);">×</button></td>
        `;
        tbody.appendChild(tr);

        // Row de Parámetros
        const trParams = document.createElement('tr');
        trParams.className = 'row-parametros';
        trParams.style.display = 'none';
        trParams.innerHTML = `
            <td colspan="10" style="background: rgba(0,0,0,0.15); padding: 1rem; border-bottom: 2px solid var(--primary-color);">
                <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
                    <div>
                        <h4 style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase;">Temperaturas Zonas (1-12)</h4>
                        <div class="grid-temps container-temps"></div>
                    </div>
                    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem;">
                        <div class="form-group"><label style="font-size: 0.75rem;">Pila</label><input type="number" class="form__input input-temp-pila" value="${data.parametros?.temp_pila || ''}"></div>
                        <div class="form-group"><label style="font-size: 0.75rem;">Horno</label><input type="number" class="form__input input-temp-horno" value="${data.parametros?.temp_horno || ''}"></div>
                        <div class="form-group"><label style="font-size: 0.75rem;">RPM</label><input type="number" class="form__input input-rpm-tornillo" value="${data.parametros?.rpm_tornillo || ''}"></div>
                        <div class="form-group"><label style="font-size: 0.75rem;">Presión</label><input type="number" class="form__input input-presion-bar" value="${data.parametros?.presion_bar || ''}"></div>
                        <div class="form-group"><label style="font-size: 0.75rem;">TopR</label><input type="number" step="0.01" class="form__input input-ratio-top" value="${data.parametros?.ratio_top_roller || ''}"></div>
                        <div class="form-group"><label style="font-size: 0.75rem;">Hold</label><input type="number" step="0.01" class="form__input input-ratio-hold" value="${data.parametros?.ratio_holding || ''}"></div>
                        <div class="form-group"><label style="font-size: 0.75rem;">Ann</label><input type="number" step="0.01" class="form__input input-ratio-ann" value="${data.parametros?.ratio_annealing || ''}"></div>
                        <div class="form-group"><label style="font-size: 0.75rem;">Stretch</label><input type="number" step="0.01" class="form__input input-ratio-stretch" value="${data.parametros?.ratio_stretching || ''}"></div>
                        <div class="form-group"><label style="font-size: 0.75rem;">Vel. Emb.</label><input type="number" class="form__input input-vel-embob" readonly value="${data.parametros?.velocidad_embobinadores || ''}" style="background: rgba(255,255,255,0.05);"></div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(trParams);

        const containerTemps = trParams.querySelector('.container-temps');
        for (let i = 1; i <= 12; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.style.marginBottom = '0';
            div.innerHTML = `
                <label style="font-size: 0.65rem; margin-bottom: 2px;">Z${i}</label>
                <input type="number" class="form__input input-temp-zona" style="padding: 4px;" data-zona="${i}" value="${data.parametros?.temperaturas?.[i-1] || ''}">
            `;
            containerTemps.appendChild(div);
        }

        // Listeners
        tr.querySelector('.btn-toggle-params').addEventListener('click', () => {
            trParams.style.display = trParams.style.display === 'none' ? 'table-row' : 'none';
        });

        const updateTenacidad = () => {
            const denier = parseFloat(tr.querySelector('.input-denier').value) || 0;
            const res = parseFloat(tr.querySelector('.input-resistencia').value) || 0;
            if (denier > 0) tr.querySelector('.input-tenacidad').value = (res / denier).toFixed(2);
        };
        tr.querySelector('.input-denier').addEventListener('input', updateTenacidad);
        tr.querySelector('.input-resistencia').addEventListener('input', updateTenacidad);

        trParams.querySelectorAll('.input-rpm-tornillo, .input-ratio-stretch').forEach(input => {
            input.addEventListener('input', () => calcularVelocidadEmbobinadores(trParams));
        });

        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
            tr.remove();
            trParams.remove();
        });

        tr.querySelector('.select-color').addEventListener('change', () => {
            checkObservacionesObligatorias();
            actualizarBadgeEstado();
        });
        tr.querySelector('.select-estado').addEventListener('change', () => {
            checkObservacionesObligatorias();
            actualizarBadgeEstado();
        });

        actualizarBadgeEstado();
    }

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
        tr.querySelector('.select-resultado').addEventListener('change', () => {
            checkObservacionesObligatorias();
            actualizarBadgeEstado();
        });
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
            tr.remove();
            actualizarBadgeEstado();
        });
        actualizarBadgeEstado();
    }

    function agregarProduccion(data = {}) {
        const tbody = document.getElementById('tbody-produccion');
        const tr = document.createElement('tr');
        const orderOptions = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden} - ${o.producto}</option>`).join('');
        tr.innerHTML = `
            <td><input type="text" class="form__input" placeholder="Máquina" value="${data.maquina || 'EXT-01'}"></td>
            <td><select class="form__input">${orderOptions}</select></td>
            <td><input type="number" class="form__input" placeholder="Kg" value="${data.cantidad || ''}"></td>
            <td><button class="button button-outline btn-eliminar-fila" style="color: var(--danger);">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
            tr.remove();
            actualizarBadgeEstado();
        });
        actualizarBadgeEstado();
    }

    function agregarDesperdicio(data = {}) {
        const tbody = document.getElementById('tbody-desperdicio');
        const tr = document.createElement('tr');
        const orderOptions = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden}</option>`).join('');
        tr.innerHTML = `
            <td><input type="text" class="form__input" placeholder="Máquina" value="${data.maquina || 'EXT-01'}"></td>
            <td><select class="form__input">${orderOptions}</select></td>
            <td><input type="number" class="form__input" placeholder="Kg" value="${data.kg || ''}"></td>
            <td><input type="text" class="form__input" placeholder="Motivo" value="${data.motivo || ''}"></td>
            <td><button class="button button-outline btn-eliminar-fila" style="color: var(--danger);">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
            tr.remove();
            actualizarBadgeEstado();
        });
        actualizarBadgeEstado();
    }

    function agregarIncidente(data = {}) {
        const tbody = document.getElementById('tbody-incidentes');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="form__input" placeholder="Minutos" value="${data.tiempo || ''}"></td>
            <td><input type="text" class="form__input" placeholder="Mecánico, eléctrico, etc." value="${data.motivo || ''}"></td>
            <td>
                <select class="form__input">
                    <option value="Mecánica" ${data.clasificacion === 'Mecánica' ? 'selected' : ''}>Mecánica</option>
                    <option value="Eléctrica" ${data.clasificacion === 'Eléctrica' ? 'selected' : ''}>Eléctrica</option>
                    <option value="Operativa" ${data.clasificacion === 'Operativa' ? 'selected' : ''}>Operativa</option>
                    <option value="Calidad" ${data.clasificacion === 'Calidad' ? 'selected' : ''}>Calidad</option>
                </select>
            </td>
            <td><button class="button button-outline btn-eliminar-fila" style="color: var(--danger);">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
            tr.remove();
            actualizarBadgeEstado();
        });
        actualizarBadgeEstado();
    }

    // Event listeners
    document.getElementById('btn-agregar-muestra-extrusor')?.addEventListener('click', () => agregarMuestraExtrusor());
    document.getElementById('btn-agregar-muestra')?.addEventListener('click', () => agregarMuestra());
    document.getElementById('btn-agregar-produccion').addEventListener('click', () => agregarProduccion());
    document.getElementById('btn-agregar-desperdicio').addEventListener('click', () => agregarDesperdicio());
    document.getElementById('btn-agregar-incidente').addEventListener('click', () => agregarIncidente());

    function checkObservacionesObligatorias() {
        let hasProblem = false;
        if (isExtrusorPP) {
            const estados = Array.from(document.querySelectorAll('.select-estado')).map(s => s.value);
            hasProblem = estados.some(e => e === 'Rechazado' || e === 'En espera');
        } else {
            const resultados = Array.from(document.querySelectorAll('.select-resultado')).map(s => s.value);
            hasProblem = resultados.some(r => r === 'Rechazo' || r === 'En espera');
        }

        const aviso = document.getElementById('aviso-obligatorio');
        aviso.style.display = hasProblem ? 'block' : 'none';
        return hasProblem;
    }

    async function guardar(volver = false) {
        const isNoOperativo = document.getElementById('select-operatividad').value === 'no_operativo';
        const motivoNoOperativo = document.getElementById('motivo-no-operativo').value;
        const observaciones = document.getElementById('observaciones').value.trim();

        if (isNoOperativo && !motivoNoOperativo.trim()) {
            alert('Debe indicar el motivo por el cual el proceso no es operativo.');
            return;
        }

        // Validaciones de Coherencia Física
        const prodRows = Array.from(document.getElementById('tbody-produccion').querySelectorAll('tr'));
        const totalProduccion = prodRows.reduce((acc, tr) => {
            const val = parseFloat(tr.querySelectorAll('input')[1]?.value) || 0;
            return acc + val;
        }, 0);

        if (isNoOperativo && totalProduccion > 0) {
            alert('Coherencia física: No puede haber producción si el proceso no es operativo.');
            return;
        }

        const tbodyCalidad = isExtrusorPP ? document.getElementById('tbody-calidad-extrusor') : document.getElementById('tbody-calidad');
        const numMuestras = tbodyCalidad.querySelectorAll('tr').length;

        if (volver && !isNoOperativo && numMuestras === 0) {
            alert('Cierre bloqueado: Se requiere al menos un registro de calidad.');
            return;
        }

        if (volver && checkObservacionesObligatorias() && !observaciones) {
            alert('Cierre bloqueado: Debe proporcionar observaciones explicativas para el rechazo/desviación.');
            return;
        }

        let data = {
            bitacora_id: currentBitacora.id,
            proceso_id: procesoId,
            no_operativo: isNoOperativo,
            motivo_no_operativo: motivoNoOperativo,
            isExtrusorPP // Flag para que el backend sepa cómo procesar
        };

        if (true) { // Siempre enviamos datos, incluso si no operativo, para incidentes/observaciones
            // Recolectar datos según tipo de proceso
            if (isExtrusorPP) {
                const rowsCalidad = Array.from(document.getElementById('tbody-calidad-extrusor').children);
                const muestras = [];

                for (let i = 0; i < rowsCalidad.length; i += 2) {
                    const tr = rowsCalidad[i];
                    const trParams = rowsCalidad[i+1];
                    if (!tr || !trParams || trParams.className !== 'row-parametros') continue;

                    const qInputs = tr.querySelectorAll('input, select');
                    const pInputs = trParams.querySelectorAll('input');
                    const tInputs = trParams.querySelectorAll('.input-temp-zona');

                    muestras.push({
                        tipo_ronda: qInputs[0].value,
                        denier: qInputs[1].value,
                        resistencia: qInputs[2].value,
                        elongacion: qInputs[3].value,
                        tenacidad: qInputs[4].value,
                        ancho: qInputs[5].value,
                        color: qInputs[6].value,
                        estado: qInputs[7].value,
                        parametros: {
                            temperaturas: Array.from(tInputs).map(ti => ti.value),
                            temp_pila: trParams.querySelector('.input-temp-pila').value,
                            temp_horno: trParams.querySelector('.input-temp-horno').value,
                            rpm_tornillo: trParams.querySelector('.input-rpm-tornillo').value,
                            presion_bar: trParams.querySelector('.input-presion-bar').value,
                            ratio_top_roller: trParams.querySelector('.input-ratio-top').value,
                            ratio_holding: trParams.querySelector('.input-ratio-hold').value,
                            ratio_annealing: trParams.querySelector('.input-ratio-ann').value,
                            ratio_stretching: trParams.querySelector('.input-ratio-stretch').value,
                            velocidad_embobinadores: trParams.querySelector('.input-vel-embob').value
                        }
                    });
                }

                const mezcla = Array.from(document.querySelectorAll('#tbody-mezcla tr')).map(tr => {
                    const inputs = tr.querySelectorAll('input');
                    return {
                        tipo: inputs[0].value,
                        marca: inputs[1].value,
                        lote: inputs[2].value,
                        porcentaje: inputs[3].value
                    };
                }).filter(m => m.porcentaje);

                if (mezcla.length > 0 && calcularTotalMezcla() !== 100) {
                    if (!confirm('La mezcla no suma 100%. ¿Desea guardar de todas formas?')) return;
                }

                const incidentes = Array.from(document.getElementById('tbody-incidentes').querySelectorAll('tr')).map(tr => {
                    const inputs = tr.querySelectorAll('input, select');
                    return {
                        tiempo: inputs[0].value,
                        motivo: inputs[1].value,
                        clasificacion: inputs[2].value
                    };
                });

                data = { ...data, muestras_estructuradas: muestras, mezcla, incidentes };
            } else {
                const muestras = Array.from(document.getElementById('tbody-calidad').querySelectorAll('tr')).map(tr => {
                    const inputs = tr.querySelectorAll('input, select');
                    return {
                        parametro: inputs[0].value,
                        valor: inputs[1].value,
                        resultado: inputs[2].value
                    };
                });
                data = { ...data, muestras };
            }

            // Datos comunes
            const produccion = Array.from(document.getElementById('tbody-produccion').querySelectorAll('tr')).map(tr => {
                const inputs = tr.querySelectorAll('input, select');
                return {
                    maquina: inputs[0].value,
                    orden_id: inputs[1].value,
                    cantidad: inputs[2].value
                };
            });

            const desperdicio = Array.from(document.getElementById('tbody-desperdicio').querySelectorAll('tr')).map(tr => {
                const inputs = tr.querySelectorAll('input, select');
                return {
                    maquina: inputs[0].value,
                    orden_id: inputs[1].value,
                    kg: inputs[2].value,
                    motivo: inputs[3].value
                };
            });

            const observaciones = document.getElementById('observaciones').value;

            if (checkObservacionesObligatorias() && !observaciones.trim()) {
                alert('Las observaciones son obligatorias si hay rechazos o desviaciones.');
                return;
            }

            data = { ...data, produccion, desperdicio, observaciones };
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

    document.getElementById('select-operatividad').addEventListener('change', (e) => {
        const isNoOperativo = e.target.value === 'no_operativo';
        document.getElementById('group-motivo').style.display = isNoOperativo ? 'block' : 'none';

        // Bloquear producción y desperdicio si no operativo
        const prodControls = document.querySelectorAll('#tbody-produccion input, #tbody-produccion select, #btn-agregar-produccion');
        const despControls = document.querySelectorAll('#tbody-desperdicio input, #tbody-desperdicio select, #btn-agregar-desperdicio');

        if (isNoOperativo) {
            prodControls.forEach(c => {
                c.disabled = true;
                if (c.type === 'number') c.value = 0;
            });
            despControls.forEach(c => {
                c.disabled = true;
                if (c.type === 'number') c.value = 0;
            });
        } else {
            prodControls.forEach(c => c.disabled = false);
            despControls.forEach(c => c.disabled = false);
        }
    });
});
