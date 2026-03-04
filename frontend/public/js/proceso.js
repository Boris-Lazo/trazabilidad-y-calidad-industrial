
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const procesoId = urlParams.get('id');
    const procesoNombre = urlParams.get('nombre');

    if (!procesoId) {
        window.location.href = '/bitacora.html';
        return;
    }

    document.getElementById('proceso-titulo').textContent = `Proceso: ${procesoNombre}`;

    let currentBitacora = null;
    let currentPlan = null;
    let orders = [];
    let contrato = null;
    let maquinasAutorizadas = [];

    // --- CARGAR DATOS INICIALES ---
    try {
        const [contratoRes, bitacoraRes, ordersRes, maquinasRes] = await Promise.all([
            fetch(`/api/procesos/${procesoId}`),
            fetch('/api/bitacora/estado'),
            fetch(`/api/ordenes-produccion?estado=Liberada&proceso_id=${procesoId}`),
            fetch(`/api/maquinas?proceso_id=${procesoId}`)
        ]);

        contrato = (await contratoRes.json()).data;
        const bitacoraResult = await bitacoraRes.json();
        const fullState = bitacoraResult.data;
        currentBitacora = fullState.bitacora;
        orders = (await ordersRes.json()).data || [];
        maquinasAutorizadas = (await maquinasRes.json()).data || [];

        document.getElementById('bread-turno').textContent = currentBitacora.turno;
        document.getElementById('bread-fecha').textContent = currentBitacora.fecha_operativa;

        // Cargar motivos de desviación
        const motivosRes = await fetch('/api/planning/motivos-desviacion');
        const motivosDesv = await motivosRes.json();
        document.getElementById('select-motivo-desv').innerHTML = motivosDesv.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');

        const procesoState = fullState.procesos.find(p => p.id == procesoId);
        applyEnforcedFlow(procesoState);

        renderTablaCalidad(contrato);
        renderParametrosOperativos(contrato);
        renderMateriasPrimas(contrato);

        initProcesoUI(procesoId);

        await cargarDatosExistentes();
        updateReloj();
        setInterval(updateReloj, 60000);

    } catch (error) {
        console.error('Error inicializando proceso:', error);
        DesignSystem.showErrorModal('Error de Configuración', 'No se pudo cargar la configuración técnica del proceso.');
    }

    function updateReloj() {
        const now = new Date();
        document.getElementById('reloj-proceso').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // --- RENDERIZADO DINÁMICO ---

    function renderTablaCalidad(contrato) {
        const container = document.getElementById('seccion-calidad-dinamica');
        const cols = contrato.parametrosCalidad;

        container.innerHTML = `
            <div class="table-container mb-4">
                <table class="table" id="tabla-calidad-dinamica">
                    <thead>
                        <tr>
                            <th>#</th>
                            ${cols.map(p => `
                                <th style="font-size: 0.8rem;">
                                    ${p.etiqueta}
                                    ${p.unidad ? `<br><small style="color:var(--text-secondary)">${p.unidad}</small>` : ''}
                                </th>
                            `).join('')}
                            <th>Estado</th>
                            <th style="width:40px;"></th>
                        </tr>
                    </thead>
                    <tbody id="tbody-calidad-dinamica"></tbody>
                </table>
            </div>
            <button id="btn-agregar-muestra-dinamica" class="btn btn-secondary">+ Agregar Muestra de Calidad</button>
        `;

        document.getElementById('btn-agregar-muestra-dinamica').onclick = () => agregarFilaMuestra(contrato);
    }

    function agregarFilaMuestra(contrato, data = {}) {
        const tbody = document.getElementById('tbody-calidad-dinamica');
        const tr = document.createElement('tr');
        const index = tbody.children.length + 1;

        const inputsHtml = contrato.parametrosCalidad.map(p => {
            const val = data[p.nombre] !== undefined ? data[p.nombre] : '';
            const readonly = p.calculado ? 'readonly style="background:rgba(0,0,0,0.05)"' : '';
            return `<td><input type="number" class="form-control input-calidad" data-nombre="${p.nombre}" value="${val}" step="0.01" ${readonly} style="padding: 4px; font-size: 0.9rem;"></td>`;
        }).join('');

        let extraTd = '';
        if (parseInt(procesoId) === 4) {
            extraTd = `<td>
                <select class="form-control input-inspeccion" style="padding: 4px; font-size: 0.8rem;">
                    <option value="1" ${data.inspeccion_indice == 1 ? 'selected' : ''}>1</option>
                    <option value="2" ${data.inspeccion_indice == 2 ? 'selected' : ''}>2</option>
                    <option value="3" ${data.inspeccion_indice == 3 ? 'selected' : ''}>3</option>
                </select>
            </td>`;
        }

        tr.innerHTML = `
            <td>${index}</td>
            ${extraTd}
            ${inputsHtml}
            <td>
                <select class="form-control select-estado-muestra" style="padding: 4px; font-size: 0.8rem;">
                    <option value="Aceptable" ${data.estado === 'Aceptable' ? 'selected' : ''}>Aceptable</option>
                    <option value="Observación" ${data.estado === 'Observación' ? 'selected' : ''}>Observación</option>
                    <option value="Rechazo" ${data.estado === 'Rechazo' ? 'selected' : ''}>Rechazo</option>
                </select>
            </td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger); border:none; background:none; cursor:pointer;">×</button></td>
        `;

        tbody.appendChild(tr);

        tr.querySelectorAll('.input-calidad').forEach(input => {
            input.oninput = () => {
                evaluarFormulasFila(tr, contrato);
                validarRangosFila(tr, contrato);
            };
        });

        tr.querySelector('.btn-eliminar-fila').onclick = () => {
            tr.remove();
            renumerarFilas('tbody-calidad-dinamica');
            checkObservacionesObligatorias();
        };

        tr.querySelector('.select-estado-muestra').onchange = checkObservacionesObligatorias;

        if (Object.keys(data).length > 0) {
            evaluarFormulasFila(tr, contrato);
            validarRangosFila(tr, contrato);
        }
    }

    function evaluarFormulasFila(tr, contrato) {
        contrato.parametrosCalidad.filter(p => p.calculado && p.formula).forEach(p => {
            try {
                const context = {};
                contrato.parametrosCalidad.forEach(param => {
                    const input = tr.querySelector(`[data-nombre="${param.nombre}"]`);
                    context[param.nombre] = parseFloat(input.value) || 0;
                });

                let expr = p.formula;
                Object.keys(context).forEach(key => {
                    expr = expr.replace(new RegExp(key, 'g'), context[key]);
                });

                const resultado = eval(expr);
                const output = tr.querySelector(`[data-nombre="${p.nombre}"]`);
                output.value = isFinite(resultado) ? resultado.toFixed(2) : '';
            } catch (e) {
                console.error("Error evaluando formula:", e);
            }
        });
    }

    function validarRangosFila(tr, contrato) {
        let esRechazo = false;
        contrato.parametrosCalidad.forEach(p => {
            if (p.minimo === null && p.maximo === null) return;
            const input = tr.querySelector(`[data-nombre="${p.nombre}"]`);
            const val = parseFloat(input.value);
            if (isNaN(val)) return;

            const fueraDeRango = (p.minimo !== null && val < p.minimo) || (p.maximo !== null && val > p.maximo);
            if (fueraDeRango) {
                esRechazo = true;
                input.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                input.style.borderColor = 'var(--danger)';
            } else {
                input.style.backgroundColor = '';
                input.style.borderColor = '';
            }
        });

        const select = tr.querySelector('.select-estado-muestra');
        select.value = esRechazo ? 'Rechazo' : 'Aceptable';
        checkObservacionesObligatorias();
    }

    function renderParametrosOperativos(contrato) {
        const params = contrato.parametrosInformativos?.filter(p => p.tipo !== 'lista_dinamica') || [];
        if (params.length === 0) return;

        document.getElementById('card-parametros-operativos').style.display = 'block';
        const container = document.getElementById('seccion-parametros-dinamica');
        container.innerHTML = '';

        const grupos = {};
        params.forEach(p => {
            if (!grupos[p.grupo]) grupos[p.grupo] = [];
            grupos[p.grupo].push(p);
        });

        Object.entries(grupos).forEach(([grupo, campos]) => {
            const titulo = grupo.charAt(0).toUpperCase() + grupo.slice(1);
            const grid = campos.map(p => `
                <div class="form-group" style="margin: 0;">
                    <label style="font-size: 0.75rem; margin-bottom: 2px;">${p.etiqueta}${p.unidad ? ` (${p.unidad})` : ''}</label>
                    <input type="number" class="form-control param-informativo"
                           data-nombre="${p.nombre}" data-grupo="${p.grupo}"
                           step="0.01" placeholder="—" style="padding: 6px;">
                </div>
            `).join('');

            container.innerHTML += `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size:0.8rem; color:var(--text-secondary); margin-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">${titulo}</h4>
                    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">${grid}</div>
                </div>
            `;
        });
    }

    function renderMateriasPrimas(contrato) {
        const paramLista = contrato.parametrosInformativos?.find(p => p.tipo === 'lista_dinamica');
        if (!paramLista) return;

        document.getElementById('card-materias-primas').style.display = 'block';
        const container = document.getElementById('seccion-materias-dinamica');

        container.innerHTML = `
            <div class="table-container mb-4">
                <table id="tabla-materias-primas" class="table">
                    <thead>
                        <tr>
                            ${paramLista.campos.map(c => `<th>${c.etiqueta}</th>`).join('')}
                            <th style="width:40px;"></th>
                        </tr>
                    </thead>
                    <tbody id="tbody-materias-dinamica"></tbody>
                </table>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <button id="btn-agregar-materia" class="btn btn-secondary" style="font-size: 0.8rem;">+ Agregar Materia Prima</button>
                <div style="font-weight: bold;">TOTAL MEZCLA: <span id="total-mezcla">0%</span></div>
            </div>
            <div id="warning-mezcla" class="text-error" style="display: none; margin-top: 0.5rem; font-size: 0.8rem;">
                ⚠ La mezcla debe sumar exactamente 100%
            </div>
        `;

        document.getElementById('btn-agregar-materia').onclick = () => agregarFilaMateria(paramLista);
        for(let i=0; i<4; i++) agregarFilaMateria(paramLista);
    }

    function agregarFilaMateria(paramLista, data = {}) {
        const tbody = document.getElementById('tbody-materias-dinamica');
        const tr = document.createElement('tr');

        tr.innerHTML = paramLista.campos.map(campo => {
            if (campo.nombre === 'tipo' && paramLista.opcionesTipo) {
                return `<td>
                    <select class="form-control input-materia" data-campo="${campo.nombre}" style="padding: 4px;">
                        <option value="">— Seleccione —</option>
                        ${paramLista.opcionesTipo.map(opt => `<option value="${opt}" ${data[campo.nombre] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </td>`;
            }
            const type = campo.nombre === 'porcentaje' ? 'number' : 'text';
            return `<td><input type="${type}" class="form-control input-materia" data-campo="${campo.nombre}" value="${data[campo.nombre] || ''}" style="padding: 4px;"></td>`;
        }).join('') + `<td><button class="btn-eliminar-fila" style="color:var(--danger); border:none; background:none; cursor:pointer;">×</button></td>`;

        tbody.appendChild(tr);
        tr.querySelectorAll('.input-materia').forEach(input => { input.oninput = calcularTotalMezcla; });
        tr.querySelector('.btn-eliminar-fila').onclick = () => { tr.remove(); calcularTotalMezcla(); };
    }

    function calcularTotalMezcla() {
        let total = 0;
        document.querySelectorAll('[data-campo="porcentaje"]').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        const display = document.getElementById('total-mezcla');
        if (display) {
            display.textContent = `${total.toFixed(1)}%`;
            display.className = total === 100 ? 'text-success' : 'text-error';
            document.getElementById('warning-mezcla').style.display = (total > 0 && Math.abs(total - 100) > 0.01) ? 'block' : 'none';
        }
        return total;
    }

    function renumerarFilas(tbodyId) {
        Array.from(document.getElementById(tbodyId).children).forEach((tr, i) => {
            tr.children[0].textContent = i + 1;
        });
    }

    function applyEnforcedFlow(state) {
        if (!state) return;

        const alertDiv = document.getElementById('proceso-blocking-alert');
        const reasonsList = document.getElementById('proceso-blocking-reasons');

        // Tarjetas y formularios
        const cardCalidad = document.getElementById('seccion-calidad-dinamica').closest('.card');
        const cardProduccion = document.getElementById('tbody-produccion').closest('.card');
        const cardDesperdicio = document.getElementById('tbody-desperdicio').closest('.card');
        const cardParos = document.getElementById('seccion-incidentes').closest('.card');
        const cardParamOperativos = document.getElementById('card-parametros-operativos');
        const cardMateriasPrimas = document.getElementById('card-materias-primas');

        if (state.bloqueos && state.bloqueos.length > 0) {
            alertDiv.style.display = 'block';
            reasonsList.innerHTML = state.bloqueos.map(r => `<li>${r}</li>`).join('');
        } else {
            alertDiv.style.display = 'none';
        }

        // REGLA FUNDAMENTAL: ELIMINAR MENÚS DE ACCIÓN OPCIONALES
        // Solo mostramos el formulario que corresponde a la siguiente acción obligatoria.

        // Ocultar TODO por defecto
        [cardCalidad, cardProduccion, cardDesperdicio, cardParos, cardParamOperativos, cardMateriasPrimas].forEach(c => {
            if (c) c.style.display = 'none';
        });

        const action = state.siguienteAccion;

        if (action === 'REGISTRAR_CALIDAD') {
            cardCalidad.style.display = 'block';
            if (cardParamOperativos) cardParamOperativos.style.display = 'block';
            if (cardMateriasPrimas) cardMateriasPrimas.style.display = 'block';
        } else if (action === 'REGISTRAR_PRODUCCION') {
            cardProduccion.style.display = 'block';
            cardDesperdicio.style.display = 'block';
        } else if (action === 'COMPLETAR_DATOS') {
            cardParos.style.display = 'block';
            // Mostrar resumen de lo anterior pero en lectura si es posible
            cardCalidad.style.display = 'block';
            cardProduccion.style.display = 'block';
        } else if (action === 'CORREGIR_O_JUSTIFICAR') {
            cardCalidad.style.display = 'block';
            cardProduccion.style.display = 'block';
            document.getElementById('observaciones').closest('.card').style.border = '2px solid var(--danger)';
        } else if (action === 'LECTURA' || action === 'NINGUNA') {
            [cardCalidad, cardProduccion, cardDesperdicio, cardParos].forEach(c => { if (c) c.style.display = 'block'; });
        }

        // Bloqueo total de inputs si no está en accionesPermitidas
        const inputs = document.querySelectorAll('input, select, textarea, button:not(#theme-toggle):not(#logout-link)');

        if (action === 'LECTURA' || state.estadoProceso === 'CERRADO') {
            inputs.forEach(i => {
                if (!i.closest('.sidebar')) i.disabled = true;
            });
            document.getElementById('btn-guardar').style.display = 'none';
            document.getElementById('btn-guardar-volver').style.display = 'none';
        }

        // Resaltar estado
        if (state.estadoProceso === 'REVISION') {
            document.getElementById('proceso-estado-badge').innerHTML = '<span class="badge badge-error">REVISIÓN REQUERIDA</span>';
        }
    }

    // --- COPIAR ÚLTIMO TURNO ---
    document.getElementById('btn-copiar-ultimo-turno').onclick = async () => {
        try {
            const res = await fetch(`/api/bitacora/proceso-data?proceso_id=${procesoId}&ultimo_turno=true`);
            const result = await res.json();
            const data = result.data;

            if (!data) {
                DesignSystem.showErrorModal('Sin Datos', 'No se encontraron registros cerrados del turno anterior para este proceso.');
                return;
            }

            if (data.parametros_operativos) {
                Object.entries(data.parametros_operativos).forEach(([key, val]) => {
                    const input = document.querySelector(`.param-informativo[data-nombre="${key}"]`);
                    if (input) input.value = val;
                });
            }

            if (data.mezcla && data.mezcla.length > 0) {
                const tbody = document.getElementById('tbody-materias-dinamica');
                tbody.innerHTML = '';
                const paramLista = contrato.parametrosInformativos.find(p => p.tipo === 'lista_dinamica');
                data.mezcla.forEach(m => agregarFilaMateria(paramLista, m));
                calcularTotalMezcla();
            }
        } catch (e) {
            console.error(e);
            DesignSystem.showErrorModal('Error al Copiar', 'Hubo un fallo al intentar recuperar los datos del turno anterior.');
        }
    };

    // --- UI ESPECÍFICA POR PROCESO ---
    function initProcesoUI(procesoId) {
        const pId = parseInt(procesoId);
        const specificProcesses = [1, 3, 4];

        document.getElementById('section-orden-especifica').style.display = 'none';
        document.getElementById('section-extrusor-pp').style.display = 'none';
        document.getElementById('section-laminado').style.display = 'none';
        document.getElementById('section-imprenta').style.display = 'none';
        document.getElementById('section-produccion-generica').style.display = 'block';

        if (specificProcesses.includes(pId)) {
            document.getElementById('section-orden-especifica').style.display = 'block';
            document.getElementById('section-produccion-generica').style.display = 'none';

            const selectOrden = document.getElementById('select-orden-proceso');
            selectOrden.innerHTML = '<option value="">— Seleccione Orden —</option>' +
                orders.map(o => `<option value="${o.id}">${o.codigo_orden}</option>`).join('');

            if (pId === 1) {
                document.getElementById('section-extrusor-pp').style.display = 'block';
            } else if (pId === 3) {
                document.getElementById('section-laminado').style.display = 'block';
                document.getElementById('btn-agregar-rollo-laminado').onclick = () => agregarFilaRolloLaminado();
            } else if (pId === 4) {
                document.getElementById('section-imprenta').style.display = 'block';
                document.getElementById('btn-agregar-rollo-imprenta').onclick = () => agregarFilaRolloImprenta();
                document.getElementById('btn-agregar-tinta').onclick = () => agregarFilaTinta();

                const headerTr = document.querySelector('#tabla-calidad-dinamica thead tr');
                if (headerTr && !headerTr.querySelector('.col-inspeccion')) {
                     const th = document.createElement('th');
                     th.className = 'col-inspeccion';
                     th.textContent = 'Inspección';
                     th.style.fontSize = '0.8rem';
                     headerTr.insertBefore(th, headerTr.children[1]);
                }
            }
        }
    }

    function agregarFilaRolloLaminado(data = {}) {
        const tbody = document.getElementById('tbody-rollos-laminado');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control codigo-rollo" value="${data.codigo_rollo || ''}" placeholder="R-XXXX"></td>
            <td><input type="number" class="form-control metros-laminados" value="${data.metros_laminados || ''}" step="0.01"></td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger); border:none; background:none; cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => tr.remove();
    }

    function agregarFilaRolloImprenta(data = {}) {
        const tbody = document.getElementById('tbody-rollos-imprenta');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control codigo-rollo" value="${data.codigo_rollo || ''}" placeholder="R-XXXX"></td>
            <td><input type="number" class="form-control metros-consumidos" value="${data.metros_consumidos || ''}" step="0.01"></td>
            <td><input type="number" class="form-control impresiones-producidas" value="${data.impresiones_producidas || ''}"></td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger); border:none; background:none; cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => tr.remove();
    }

    function agregarFilaTinta(data = {}) {
        const tbody = document.getElementById('tbody-tintas');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="form-control tinta-pos" value="${data.posicion || ''}" style="width:50px;"></td>
            <td><input type="text" class="form-control tinta-num" value="${data.numero_color || ''}"></td>
            <td><input type="text" class="form-control tinta-pantone" value="${data.codigo_pantone || ''}"></td>
            <td><input type="text" class="form-control tinta-tipo" value="${data.tipo || ''}"></td>
            <td><input type="text" class="form-control tinta-marca" value="${data.marca || ''}"></td>
            <td><input type="text" class="form-control tinta-lote" value="${data.lote || ''}"></td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger); border:none; background:none; cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => tr.remove();
    }

    // --- CARGAR DATOS EXISTENTES ---
    async function cargarDatosExistentes() {
        try {
            const pId = parseInt(procesoId);
            const DETALLE_ENDPOINTS = {
                1: `/api/extrusor-pp/detalle/${currentBitacora.id}`,
                3: `/api/laminado/detalle/0?bitacora_id=${currentBitacora.id}`,
                4: `/api/imprenta/detalle/0?bitacora_id=${currentBitacora.id}`,
            };

            let data = {};
            if (DETALLE_ENDPOINTS[pId]) {
                const res = await fetch(DETALLE_ENDPOINTS[pId]);
                const result = await res.json();
                data = result.data || {};

                // Mapeo específico de vuelta al formato que espera cargarDatosExistentes
                if (pId === 1) {
                    data.muestras_estructuradas = data.muestras;
                    if (data.produccion) {
                        document.getElementById('input-acumulado-contador').value = data.produccion.acumulado_contador || '';
                        document.getElementById('observaciones').value = data.produccion.observaciones || '';
                    }
                    if (data.parametros_operativos && data.parametros_operativos.materias_primas) {
                        data.mezcla = data.parametros_operativos.materias_primas;
                    }
                } else if (pId === 3) {
                    // Mapear muestras de Laminado (parametro, valor) a filas
                    // Laminado suele tener parámetros fijos por contrato, hay que reconstruir las filas
                    // Si el backend devuelve muestras planas, agrupamos por algo si es posible,
                    // o simplemente asumimos que cada N muestras es una fila si el contrato tiene N params.
                    // Para simplificar, si el servicio no las devuelve estructuradas, las dejamos vacías para que el usuario las llene,
                    // o intentamos un mapeo básico.
                    if (data.rollos) data.rollos.forEach(r => agregarFilaRolloLaminado(r));
                    document.getElementById('input-pelicula-impresa').value = data.pelicula_impresa || '';
                    if (data.muestras) {
                        // Mapeo rudimentario: si todas las muestras tienen el mismo timestamp o algo, pero aquí no hay.
                        // Usaremos el endpoint genérico como fallback para muestras si el específico es muy complejo de mapear.
                    }
                } else if (pId === 4) {
                    if (data.rollos) data.rollos.forEach(r => agregarFilaRolloImprenta(r));
                    if (data.tintas) data.tintas.forEach(t => agregarFilaTinta(t));
                }

                if (data.orden_id) document.getElementById('select-orden-proceso').value = data.orden_id;
            }

            const resGen = await fetch(`/api/bitacora/proceso-data?bitacora_id=${currentBitacora.id}&proceso_id=${procesoId}`);
            const resultGen = await resGen.json();
            const dataGen = resultGen.data || {};

            // Mezclar datos genéricos con específicos
            data = { ...dataGen, ...data };
            currentPlan = data.planificado;

            // --- HERENCIA DE PLANIFICACIÓN ---
            if (currentPlan) {
                const tbodyP = document.getElementById('tbody-personal-planificado');
                if (currentPlan.personal?.length) {
                    currentPlan.personal.forEach(p => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `<td>${p.nombre_completo}</td><td>${p.rol_nombre || '-'}</td><td>✅</td>`;
                        tbodyP.appendChild(tr);
                    });
                } else {
                    tbodyP.innerHTML = '<tr><td colspan="3" style="text-align:center">No hay personal planificado</td></tr>';
                }
            }

            if (currentPlan && !data.produccion?.length && !data.no_operativo) {
                if (currentPlan.ordenes?.length) {
                    currentPlan.ordenes.forEach(o => agregarProduccion({ orden_id: o.orden_id, maquina_id: o.maquina_id, cantidad: 0 }));
                    if ([1, 3, 4].includes(pId)) {
                        document.getElementById('select-orden-proceso').value = currentPlan.ordenes[0].orden_id;
                    }
                }
            }

            if (data.no_operativo) {
                document.getElementById('select-operatividad').value = 'no_operativo';
                document.getElementById('group-motivo').style.display = 'block';
                document.getElementById('motivo-no-operativo').value = data.motivo_no_operativo;
                document.getElementById('secciones-operativas').style.display = 'none';
            }

            if (data.muestras_estructuradas && data.muestras_estructuradas.length > 0) {
                data.muestras_estructuradas.forEach(m => agregarFilaMuestra(contrato, m));
            } else {
                const min = contrato.frecuenciaMuestreo?.muestrasMinTurno || 1;
                for(let i=0; i<min; i++) agregarFilaMuestra(contrato);
            }

            if (data.parametros_operativos) {
                Object.entries(data.parametros_operativos).forEach(([key, val]) => {
                    const input = document.querySelector(`.param-informativo[data-nombre="${key}"]`);
                    if (input) input.value = val;
                });
            }

            if (data.mezcla && data.mezcla.length > 0) {
                const tbody = document.getElementById('tbody-materias-dinamica');
                tbody.innerHTML = '';
                const paramLista = contrato.parametrosInformativos.find(p => p.tipo === 'lista_dinamica');
                data.mezcla.forEach(m => agregarFilaMateria(paramLista, m));
                calcularTotalMezcla();
            }

            data.produccion?.forEach(p => agregarProduccion(p));
            data.desperdicio?.forEach(d => agregarDesperdicio(d));
            data.incidentes?.forEach(inc => agregarIncidente(inc));
            document.getElementById('observaciones').value = data.observaciones || '';

            if (data.solo_lectura) {
                document.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (!el.closest('.sidebar') && el.id !== 'theme-toggle') el.disabled = true;
                });
                document.querySelectorAll('.btn-secondary, .btn-primary').forEach(el => {
                    if (el.id !== 'theme-toggle') el.style.display = 'none';
                });
            }

            await updateBalanceTiempos();
            checkObservacionesObligatorias();

        } catch (e) {
            console.error("Error cargando datos:", e);
        }
    }

    async function updateBalanceTiempos() {
        const res = await fetch(`/api/bitacora/resumen-tiempo?bitacora_id=${currentBitacora.id}&proceso_id=${procesoId}`);
        const result = await res.json();
        const data = result.data;
        if (!data) return;

        document.getElementById('tiempo-prog').textContent = `${data.tiempo_programado} min`;
        document.getElementById('tiempo-paro').textContent = `${data.total_paros} min`;
        document.getElementById('tiempo-efectivo').textContent = `${data.tiempo_efectivo} min`;

        const badge = document.getElementById('badge-estado-proceso');
        if (data.total_paros > data.tiempo_programado) {
            badge.className = 'badge badge-error';
            badge.textContent = 'EXCESO DE PARO';
        }
    }

    // --- GUARDADO ---
    function buildPayload(pId) {
        const isNoOperativo = document.getElementById('select-operatividad').value === 'no_operativo';
        const motivoNoOperativo = document.getElementById('motivo-no-operativo').value;
        const ordenId = parseInt(document.getElementById('select-orden-proceso').value) || null;
        const observaciones = document.getElementById('observaciones').value;

        if (isNoOperativo) {
            return {
                bitacora_id: currentBitacora.id,
                proceso_id: pId,
                no_operativo: true,
                motivo_no_operativo: motivoNoOperativo
            };
        }

        const getGenericData = () => {
            const muestras_estructuradas = Array.from(document.querySelectorAll('#tbody-calidad-dinamica tr')).map(tr => {
                const obj = {};
                contrato.parametrosCalidad.forEach(p => {
                    const val = tr.querySelector(`[data-nombre="${p.nombre}"]`).value;
                    obj[p.nombre] = val !== '' ? parseFloat(val) : null;
                });
                obj.estado = tr.querySelector('.select-estado-muestra').value;
                if (pId === 4) obj.inspeccion_indice = parseInt(tr.querySelector('.input-inspeccion').value);
                return obj;
            });

            const parametros_operativos = {};
            document.querySelectorAll('.param-informativo').forEach(input => {
                parametros_operativos[input.dataset.nombre] = input.value !== '' ? parseFloat(input.value) : null;
            });

            const mezcla = Array.from(document.querySelectorAll('#tbody-materias-dinamica tr')).map(tr => {
                const obj = {};
                const paramLista = contrato.parametrosInformativos.find(p => p.tipo === 'lista_dinamica');
                paramLista.campos.forEach(campo => {
                    const input = tr.querySelector(`[data-campo="${campo.nombre}"]`);
                    obj[campo.nombre] = campo.nombre === 'porcentaje' ? parseFloat(input.value) || 0 : input.value;
                });
                return obj;
            }).filter(m => Object.values(m).some(v => v !== '' && v !== 0));

            const desperdicio_total = Array.from(document.getElementById('tbody-desperdicio').querySelectorAll('tr')).reduce((sum, tr) => {
                return sum + (parseFloat(tr.querySelector('input').value) || 0);
            }, 0);

            const incidentes = Array.from(document.getElementById('tbody-incidentes').querySelectorAll('tr')).map(tr => {
                return {
                    tiempo: parseInt(tr.querySelector('input').value) || 0,
                    motivo: tr.querySelectorAll('input')[1].value,
                    clasificacion: tr.querySelector('select').value
                };
            });

            return { muestras_estructuradas, parametros_operativos, mezcla, desperdicio_total, incidentes };
        };

        const generic = getGenericData();

        if (pId === 1) { // Extrusor PP
            return {
                bitacora_id: currentBitacora.id,
                orden_id: ordenId,
                produccion: {
                    acumulado_contador: parseFloat(document.getElementById('input-acumulado-contador').value) || 0,
                    desperdicio_kg: generic.desperdicio_total,
                    observaciones: observaciones
                },
                muestras: generic.muestras_estructuradas.map(m => ({
                    denier: m.denier,
                    resistencia: m.resistencia,
                    elongacion: m.elongacion,
                    ancho_cinta: m.ancho_cinta,
                    resultado_denier: m.denier_res, // Estos campos dependen del contrato
                    resultado_resistencia: m.resistencia_res,
                    resultado_elongacion: m.elongacion_res,
                    resultado_ancho_cinta: m.ancho_cinta_res
                })),
                parametros_operativos: {
                    materias_primas: generic.mezcla,
                    ...generic.parametros_operativos
                }
            };
        }

        if (pId === 3) { // Laminado
            return {
                bitacora_id: currentBitacora.id,
                orden_id: ordenId,
                rollos: Array.from(document.getElementById('tbody-rollos-laminado').children).map(tr => ({
                    codigo_rollo: tr.querySelector('.codigo-rollo').value,
                    metros_laminados: parseFloat(tr.querySelector('.metros-laminados').value) || 0
                })),
                muestras: generic.muestras_estructuradas.flatMap(m => {
                    // Mapear de objeto a lista de muestras planas (parametro, valor, resultado)
                    return contrato.parametrosCalidad.filter(p => !p.calculado).map(p => ({
                        parametro: p.nombre,
                        valor: m[p.nombre],
                        resultado: m.estado,
                        valor_nominal: p.valorNominal || 0
                    }));
                }),
                parametros_operativos: generic.parametros_operativos,
                materias_primas: generic.mezcla,
                pelicula_impresa: document.getElementById('input-pelicula-impresa').value || null,
                desperdicio_kg: generic.desperdicio_total,
                observaciones: observaciones
            };
        }

        if (pId === 4) { // Imprenta
            return {
                bitacora_id: currentBitacora.id,
                orden_id: ordenId,
                rollos: Array.from(document.getElementById('tbody-rollos-imprenta').children).map(tr => ({
                    codigo_rollo: tr.querySelector('.codigo-rollo').value,
                    metros_consumidos: parseFloat(tr.querySelector('.metros-consumidos').value) || 0,
                    impresiones_producidas: parseInt(tr.querySelector('.impresiones-producidas').value) || 0
                })),
                tintas: Array.from(document.getElementById('tbody-tintas').children).map(tr => ({
                    posicion: parseInt(tr.querySelector('.tinta-pos').value),
                    numero_color: tr.querySelector('.tinta-num').value,
                    codigo_pantone: tr.querySelector('.tinta-pantone').value,
                    tipo: tr.querySelector('.tinta-tipo').value,
                    marca: tr.querySelector('.tinta-marca').value,
                    lote: tr.querySelector('.tinta-lote').value
                })),
                muestras: generic.muestras_estructuradas.flatMap(m => {
                    return contrato.parametrosCalidad.filter(p => !p.calculado).map(p => ({
                        inspeccion_indice: m.inspeccion_indice,
                        parametro: p.nombre,
                        valor: m[p.nombre],
                        resultado: m.estado,
                        // Tintas se asocian si el parametro de calidad coincide con el color?
                        // El contrato de Imprenta en el backend es dinámico.
                    }));
                }),
                desperdicio_kg: generic.desperdicio_total,
                tipo_desperdicio: 'General',
                parametros_operativos: generic.parametros_operativos,
                observaciones: observaciones
            };
        }

        // Fallback genérico
        const produccion = Array.from(document.getElementById('tbody-produccion').querySelectorAll('tr')).map(tr => {
            return {
                maquina_id: tr.querySelector('select').value,
                maquina: tr.querySelector('select option:checked').text,
                orden_id: tr.querySelectorAll('select')[1].value,
                cantidad: parseFloat(tr.querySelector('input').value) || 0
            };
        });

        const desperdicio = Array.from(document.getElementById('tbody-desperdicio').querySelectorAll('tr')).map(tr => {
            return {
                maquina_id: tr.querySelector('select').value,
                orden_id: tr.querySelectorAll('select')[1].value,
                kg: parseFloat(tr.querySelector('input').value) || 0,
                motivo: tr.querySelectorAll('input')[1].value
            };
        });

        return {
            bitacora_id: currentBitacora.id,
            proceso_id: pId,
            no_operativo: false,
            muestras_estructuradas: generic.muestras_estructuradas,
            parametros_operativos: generic.parametros_operativos,
            mezcla: generic.mezcla,
            produccion,
            desperdicio,
            incidentes: generic.incidentes,
            observaciones
        };
    }

    async function guardar(volver = false) {
        const pId = parseInt(procesoId);
        const PROCESO_ENDPOINTS = {
            1: '/api/extrusor-pp/guardar',
            3: '/api/laminado/guardar',
            4: '/api/imprenta/guardar',
        };

        const endpoint = PROCESO_ENDPOINTS[pId] || '/api/bitacora/guardar-proceso';
        const payload = buildPayload(pId);

        if (checkObservacionesObligatorias() && !payload.observaciones?.trim()) {
            DesignSystem.showErrorModal('Observación Requerida', 'Las observaciones son obligatorias cuando existen rechazos o desviaciones en la calidad.');
            return;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                if (volver) window.location.href = '/bitacora.html';
                else {
                    DesignSystem.showToast('Guardado con éxito.', 'success');
                    await updateBalanceTiempos();
                }
            } else {
                const err = await response.json();
                DesignSystem.showErrorModal('Error al Guardar', 'No se pudieron guardar los cambios: ' + (err.message || 'Error del servidor'));
            }
        } catch (e) {
            console.error(e);
        }
    }

    function checkObservacionesObligatorias() {
        const hasProblem = Array.from(document.querySelectorAll('.select-estado-muestra')).some(s => s.value !== 'Aceptable');
        const aviso = document.getElementById('aviso-obligatorio');
        if (aviso) aviso.style.display = hasProblem ? 'block' : 'none';
        return hasProblem;
    }

    // --- TABLAS DE PRODUCCIÓN ---
    function agregarProduccion(data = {}) {
        const tbody = document.getElementById('tbody-produccion');
        const tr = document.createElement('tr');
        const maquinaOptions = maquinasAutorizadas.map(m => `<option value="${m.id}" ${data.maquina_id == m.id ? 'selected' : ''}>${m.nombre_visible}</option>`).join('');
        const orderOptions = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden}</option>`).join('');

        tr.innerHTML = `
            <td><select class="form-control" style="padding: 4px;">${maquinaOptions}</select></td>
            <td><select class="form-control" style="padding: 4px;">${orderOptions}</select></td>
            <td><input type="number" class="form-control" value="${data.cantidad || ''}" style="padding: 4px;"></td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger); border:none; background:none; cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => tr.remove();
    }

    function agregarDesperdicio(data = {}) {
        const tbody = document.getElementById('tbody-desperdicio');
        const tr = document.createElement('tr');
        const maquinaOptions = maquinasAutorizadas.map(m => `<option value="${m.id}" ${data.maquina_id == m.id ? 'selected' : ''}>${m.nombre_visible}</option>`).join('');
        const orderOptions = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden}</option>`).join('');

        tr.innerHTML = `
            <td><select class="form-control" style="padding: 4px;">${maquinaOptions}</select></td>
            <td><select class="form-control" style="padding: 4px;">${orderOptions}</select></td>
            <td><input type="number" class="form-control" value="${data.kg || ''}" style="padding: 4px;"></td>
            <td><input type="text" class="form-control" value="${data.motivo || ''}" style="padding: 4px;"></td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger); border:none; background:none; cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => tr.remove();
    }

    function agregarIncidente(data = {}) {
        const tbody = document.getElementById('tbody-incidentes');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="form-control" value="${data.tiempo || ''}" style="padding: 4px;"></td>
            <td><input type="text" class="form-control" value="${data.motivo || ''}" style="padding: 4px;"></td>
            <td>
                <select class="form-control" style="padding: 4px;">
                    <option value="Operativa" ${data.clasificacion === 'Operativa' ? 'selected' : ''}>Operativa</option>
                    <option value="Mecánica" ${data.clasificacion === 'Mecánica' ? 'selected' : ''}>Mecánica</option>
                    <option value="Eléctrica" ${data.clasificacion === 'Eléctrica' ? 'selected' : ''}>Eléctrica</option>
                    <option value="Calidad" ${data.clasificacion === 'Calidad' ? 'selected' : ''}>Calidad</option>
                </select>
            </td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger); border:none; background:none; cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => { tr.remove(); updateBalanceTiempos(); };
    }

    document.getElementById('btn-agregar-produccion').onclick = () => agregarProduccion();
    document.getElementById('btn-agregar-desperdicio').onclick = () => agregarDesperdicio();
    document.getElementById('btn-agregar-incidente').onclick = () => agregarIncidente();
    document.getElementById('btn-guardar').onclick = () => checkDesviaciones(false);
    document.getElementById('btn-guardar-volver').onclick = () => checkDesviaciones(true);

    async function checkDesviaciones(volver) {
        if (!currentPlan) return guardar(volver);

        // Validar personal
        const personasActuales = Array.from(new Set(personalAutorizado?.map(p => p.id) || [])); // TODO: Vincular personal real de bitácora si existiera tabla intermedia
        // Por ahora simplificamos a Ordenes y Máquinas

        const regs = Array.from(document.getElementById('tbody-produccion').querySelectorAll('tr')).map(tr => ({
            orden_id: tr.querySelectorAll('select')[1].value,
            maquina_id: tr.querySelector('select').value
        }));

        if ([1,3,4].includes(parseInt(procesoId))) {
            const ord = document.getElementById('select-orden-proceso').value;
            if (ord) regs.push({ orden_id: ord });
        }

        // Desviación de Orden
        for (const r of regs) {
            const planOrd = currentPlan.ordenes.find(o => o.orden_id == r.orden_id);
            if (!planOrd) {
                return abrirModalDesviacion('CAMBIO_ORDEN', 'N/A', r.orden_id, volver);
            }
            if (r.maquina_id && planOrd.maquina_id && r.maquina_id != planOrd.maquina_id) {
                return abrirModalDesviacion('CAMBIO_MAQUINA', planOrd.maquina_id, r.maquina_id, volver);
            }
        }

        await guardar(volver);
    }

    function cerrarModalDesviacion() {
        document.getElementById('modal-desviacion').style.display = 'none';
        document.getElementById('select-motivo-desv').value = '';
        document.getElementById('comentario-desv').value = '';
        document.getElementById('form-desv-tipo').value = '';
        document.getElementById('form-desv-plan').value = '';
        document.getElementById('form-desv-actual').value = '';
    }

    function abrirModalDesviacion(tipo, plan, actual, volver) {
        document.getElementById('form-desv-tipo').value = tipo;
        document.getElementById('form-desv-plan').value = plan;
        document.getElementById('form-desv-actual').value = actual;
        document.getElementById('desviacion-mensaje').textContent =
            `Se detectó un cambio de ${tipo.replace('_', ' ')} respecto a lo planificado.`;
        document.getElementById('modal-desviacion').style.display = 'flex';

        document.getElementById('btn-cerrar-desv').onclick = cerrarModalDesviacion;
        document.getElementById('btn-cancelar-desv').onclick = cerrarModalDesviacion;

        document.getElementById('btn-confirmar-desv').onclick = async () => {
            await fetch('/api/planning/deviation', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    plan_id: currentPlan.plan.id,
                    bitacora_id: currentBitacora.id,
                    proceso_id: procesoId,
                    tipo_desviacion: tipo,
                    valor_planificado: plan,
                    valor_ejecutado: actual,
                    motivo_id: document.getElementById('select-motivo-desv').value,
                    comentario: document.getElementById('comentario-desv').value
                })
            });
            cerrarModalDesviacion();
            await guardar(volver);
        };
    }

    document.getElementById('select-operatividad').onchange = (e) => {
        const isNo = e.target.value === 'no_operativo';
        document.getElementById('group-motivo').style.display = isNo ? 'block' : 'none';
        document.getElementById('secciones-operativas').style.display = isNo ? 'none' : 'block';
    };
});
