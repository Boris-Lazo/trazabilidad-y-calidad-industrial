
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
    let contrato = null;

    // 1. CARGAR DATOS INICIALES (Contrato + Estado Bitácora + Órdenes)
    try {
        const [contratoRes, bitacoraRes, ordersRes] = await Promise.all([
            fetch(`/api/procesos/${procesoId}`),
            fetch('/api/bitacora/estado'),
            fetch(`/api/ordenes-produccion?estado=Liberada&proceso_id=${procesoId}`)
        ]);

        const contratoResult = await contratoRes.json();
        contrato = contratoResult.data;

        const bitacoraResult = await bitacoraRes.json();
        currentBitacora = bitacoraResult.data.bitacora;

        const ordersResult = await ordersRes.json();
        orders = ordersResult.data || [];

        document.getElementById('bread-turno').textContent = currentBitacora.turno;
        document.getElementById('bread-fecha').textContent = currentBitacora.fecha_operativa;

        // 2. RENDERIZAR FORMULARIO DINÁMICO
        renderTablaCalidad(contrato);
        renderParametrosOperativos(contrato);
        renderMateriasPrimas(contrato);

        // 3. CARGAR DATOS EXISTENTES
        await cargarDatosExistentes();

    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        alert('Error al cargar la configuración del proceso.');
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
                                <th>
                                    ${p.etiqueta}
                                    ${p.unidad ? `<br><small style="font-weight:normal;color:var(--text-secondary)">${p.unidad}</small>` : ''}
                                </th>
                            `).join('')}
                            <th>Estado</th>
                            <th style="width:50px;"></th>
                        </tr>
                    </thead>
                    <tbody id="tbody-calidad-dinamica"></tbody>
                </table>
            </div>
            <button id="btn-agregar-muestra-dinamica" class="btn btn-secondary">+ Agregar Muestra</button>
        `;

        document.getElementById('btn-agregar-muestra-dinamica').onclick = () => agregarFilaMuestra(contrato);
    }

    function agregarFilaMuestra(contrato, data = {}) {
        const tbody = document.getElementById('tbody-calidad-dinamica');
        const tr = document.createElement('tr');
        const index = tbody.children.length + 1;

        const inputsHtml = contrato.parametrosCalidad.map(p => {
            const val = data[p.nombre] !== undefined ? data[p.nombre] : '';
            const readonly = p.calculado ? 'readonly style="background:rgba(255,255,255,0.05)"' : '';
            return `<td><input type="number" class="form-control input-calidad" data-nombre="${p.nombre}" value="${val}" step="0.01" ${readonly}></td>`;
        }).join('');

        tr.innerHTML = `
            <td>${index}</td>
            ${inputsHtml}
            <td>
                <select class="form-control select-estado-muestra">
                    <option value="Aceptable" ${data.estado === 'Aceptable' ? 'selected' : ''}>Aceptable</option>
                    <option value="Observación" ${data.estado === 'Observación' ? 'selected' : ''}>Observación</option>
                    <option value="Rechazo" ${data.estado === 'Rechazo' ? 'selected' : ''}>Rechazo</option>
                </select>
            </td>
            <td><button class="btn-eliminar-fila" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.2rem;">×</button></td>
        `;

        tbody.appendChild(tr);

        // Listeners para cálculos y validación
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
                // Crear contexto de variables desde los inputs de la fila
                const context = {};
                contrato.parametrosCalidad.forEach(param => {
                    const input = tr.querySelector(`[data-nombre="${param.nombre}"]`);
                    context[param.nombre] = parseFloat(input.value) || 0;
                });

                // Evaluar fórmula simple (reemplazo de nombres por valores)
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

            const val = parseFloat(tr.querySelector(`[data-nombre="${p.nombre}"]`).value);
            if (isNaN(val)) return;

            const fueraDeRango = (p.minimo !== null && val < p.minimo) || (p.maximo !== null && val > p.maximo);
            if (fueraDeRango) esRechazo = true;
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

        const etiquetasGrupo = {
            maquina: 'Máquina',
            temperaturas: 'Temperaturas (°C)',
            ratios: 'Ratios de Estiraje'
        };

        Object.entries(grupos).forEach(([grupo, campos]) => {
            const titulo = etiquetasGrupo[grupo] || grupo.charAt(0).toUpperCase() + grupo.slice(1);
            const grid = campos.map(p => `
                <div class="form-group">
                    <label>${p.etiqueta}${p.unidad ? ` (${p.unidad})` : ''}</label>
                    <input type="number" class="form-control param-informativo"
                           data-nombre="${p.nombre}" data-grupo="${p.grupo}"
                           step="0.01" placeholder="—">
                </div>
            `).join('');

            container.innerHTML += `
                <h4 style="font-size:0.85rem;color:var(--text-secondary);margin:1rem 0 0.5rem">${titulo}</h4>
                <div class="dashboard-grid">${grid}</div>
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
                <table id="tabla-materias-primas">
                    <thead>
                        <tr>
                            ${paramLista.campos.map(c => `<th>${c.etiqueta}</th>`).join('')}
                            <th style="width:50px;"></th>
                        </tr>
                    </thead>
                    <tbody id="tbody-materias-dinamica"></tbody>
                    <tfoot>
                        <tr>
                            <td colspan="${paramLista.campos.length - 1}" style="text-align: right; font-weight: bold;">TOTAL:</td>
                            <td id="total-mezcla" style="font-weight: bold;">0%</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div id="warning-mezcla" class="text-error" style="display: none; margin-bottom:1rem;">⚠ La suma debe ser exactamente 100%</div>
            <button id="btn-agregar-materia" class="btn btn-secondary">+ Agregar Materia Prima</button>
        `;

        document.getElementById('btn-agregar-materia').onclick = () => agregarFilaMateria(paramLista);

        // Inicializar con 6 filas si está vacío
        for(let i=0; i<6; i++) agregarFilaMateria(paramLista);
    }

    function agregarFilaMateria(paramLista, data = {}) {
        const tbody = document.getElementById('tbody-materias-dinamica');
        const tr = document.createElement('tr');

        tr.innerHTML = paramLista.campos.map(campo => {
            if (campo.nombre === 'tipo' && paramLista.opcionesTipo) {
                return `<td>
                    <select class="form-control input-materia" data-campo="${campo.nombre}">
                        <option value="">— Seleccione —</option>
                        ${paramLista.opcionesTipo.map(opt => `<option value="${opt}" ${data[campo.nombre] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </td>`;
            }
            const step = campo.nombre === 'porcentaje' ? 'step="0.1"' : '';
            const type = campo.nombre === 'porcentaje' ? 'number' : 'text';
            return `<td><input type="${type}" class="form-control input-materia" data-campo="${campo.nombre}" value="${data[campo.nombre] || ''}" ${step}></td>`;
        }).join('') + `<td><button class="btn-eliminar-fila" style="background:none;border:none;color:var(--danger);cursor:pointer;">×</button></td>`;

        tbody.appendChild(tr);

        tr.querySelectorAll('.input-materia').forEach(input => {
            input.oninput = calcularTotalMezcla;
        });

        tr.querySelector('.btn-eliminar-fila').onclick = () => {
            tr.remove();
            calcularTotalMezcla();
        };
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

    // --- COPIAR DEL TURNO ANTERIOR ---
    document.getElementById('btn-copiar-ultimo-turno').onclick = async () => {
        try {
            const res = await fetch(`/api/bitacora/proceso-data?proceso_id=${procesoId}&ultimo_turno=true`);
            const result = await res.json();
            const data = result.data;

            if (!data || (!data.parametros_operativos && (!data.mezcla || data.mezcla.length === 0))) {
                alert('No se encontraron datos cerrados del turno anterior para este proceso.');
                return;
            }

            // Copiar parámetros operativos
            if (data.parametros_operativos) {
                Object.entries(data.parametros_operativos).forEach(([key, val]) => {
                    const input = document.querySelector(`.param-informativo[data-nombre="${key}"]`);
                    if (input) input.value = val;
                });
            }

            // Copiar mezcla
            if (data.mezcla && data.mezcla.length > 0) {
                const tbody = document.getElementById('tbody-materias-dinamica');
                tbody.innerHTML = '';
                const paramLista = contrato.parametrosInformativos.find(p => p.tipo === 'lista_dinamica');
                data.mezcla.forEach(m => agregarFilaMateria(paramLista, m));
                calcularTotalMezcla();
            }

            alert('Parámetros copiados del turno anterior. Revisa y ajusta si hubo cambios.');
        } catch (e) {
            console.error(e);
            alert('Error al intentar copiar datos del turno anterior.');
        }
    };

    // --- CARGAR DATOS EXISTENTES ---

    async function cargarDatosExistentes() {
        try {
            const res = await fetch(`/api/bitacora/proceso-data?bitacora_id=${currentBitacora.id}&proceso_id=${procesoId}`);
            const result = await res.json();
            const data = result.data || {};

            if (data.no_operativo) {
                document.getElementById('select-operatividad').value = 'no_operativo';
                document.getElementById('group-motivo').style.display = 'block';
                document.getElementById('motivo-no-operativo').value = data.motivo_no_operativo;
                document.getElementById('secciones-operativas').style.display = 'none';
            }

            // Muestras
            if (data.muestras_estructuradas && data.muestras_estructuradas.length > 0) {
                data.muestras_estructuradas.forEach(m => agregarFilaMuestra(contrato, m));
            } else {
                // Si es nuevo, agregar 3 vacías si el contrato lo sugiere (mínimo de frecuencia)
                const min = contrato.frecuenciaMuestreo?.muestrasMinTurno || 1;
                for(let i=0; i<min; i++) agregarFilaMuestra(contrato);
            }

            // Parámetros operativos
            if (data.parametros_operativos) {
                Object.entries(data.parametros_operativos).forEach(([key, val]) => {
                    const input = document.querySelector(`.param-informativo[data-nombre="${key}"]`);
                    if (input) input.value = val;
                });
            }

            // Mezcla
            if (data.mezcla && data.mezcla.length > 0) {
                const tbody = document.getElementById('tbody-materias-dinamica');
                tbody.innerHTML = '';
                const paramLista = contrato.parametrosInformativos.find(p => p.tipo === 'lista_dinamica');
                data.mezcla.forEach(m => agregarFilaMateria(paramLista, m));
                calcularTotalMezcla();
            }

            // Datos comunes
            data.produccion?.forEach(p => agregarProduccion(p));
            data.desperdicio?.forEach(d => agregarDesperdicio(d));
            data.incidentes?.forEach(inc => agregarIncidente(inc));
            document.getElementById('observaciones').value = data.observaciones || '';

            if (data.solo_lectura) {
                document.querySelectorAll('input, select, textarea, button').forEach(el => {
                    if (el.id !== 'theme-toggle' && !el.closest('.sidebar')) el.disabled = true;
                });
                document.querySelectorAll('.btn-eliminar-fila, #btn-guardar, #btn-guardar-volver, #btn-copiar-ultimo-turno, [id^="btn-agregar"]').forEach(el => {
                    el.style.display = 'none';
                });
            }
            checkObservacionesObligatorias();
        } catch (e) {
            console.error("Error al cargar datos existentes:", e);
        }
    }

    // --- GUARDAR ---

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
            motivo_no_operativo: motivoNoOperativo,
            usuario: auth.getUser().nombre || auth.getUser().username
        };

        if (!isNoOperativo) {
            // Recolectar Muestras de calidad
            const muestras_estructuradas = Array.from(document.querySelectorAll('#tbody-calidad-dinamica tr')).map(tr => {
                const obj = {};
                contrato.parametrosCalidad.forEach(p => {
                    const val = tr.querySelector(`[data-nombre="${p.nombre}"]`).value;
                    obj[p.nombre] = val !== '' ? parseFloat(val) : null;
                });
                obj.estado = tr.querySelector('.select-estado-muestra').value;
                return obj;
            });

            // Recolectar Parámetros operativos
            const parametros_operativos = {};
            document.querySelectorAll('.param-informativo').forEach(input => {
                parametros_operativos[input.dataset.nombre] = input.value !== '' ? parseFloat(input.value) : null;
            });

            // Recolectar Mezcla
            const mezcla = Array.from(document.querySelectorAll('#tbody-materias-dinamica tr')).map(tr => {
                const obj = {};
                const paramLista = contrato.parametrosInformativos.find(p => p.tipo === 'lista_dinamica');
                paramLista.campos.forEach(campo => {
                    const input = tr.querySelector(`[data-campo="${campo.nombre}"]`);
                    obj[campo.nombre] = campo.nombre === 'porcentaje' ? parseFloat(input.value) || 0 : input.value;
                });
                return obj;
            }).filter(m => Object.values(m).some(v => v !== '' && v !== 0));

            if (mezcla.length > 0 && Math.abs(calcularTotalMezcla() - 100) > 0.1) {
                if (!confirm('La mezcla no suma 100%. ¿Desea guardar de todas formas?')) return;
            }

            // Recolectar Producción
            const produccion = Array.from(document.getElementById('tbody-produccion').querySelectorAll('tr')).map(tr => {
                const inputs = tr.querySelectorAll('input, select');
                return {
                    maquina: inputs[0].value,
                    orden_id: inputs[1].value,
                    cantidad: parseFloat(inputs[2].value) || 0
                };
            });

            // Recolectar Desperdicio
            const desperdicio = Array.from(document.getElementById('tbody-desperdicio').querySelectorAll('tr')).map(tr => {
                const inputs = tr.querySelectorAll('input, select');
                return {
                    maquina: inputs[0].value,
                    orden_id: inputs[1].value,
                    kg: parseFloat(inputs[2].value) || 0,
                    motivo: inputs[3].value
                };
            });

            // Incidentes
            const incidentes = Array.from(document.getElementById('tbody-incidentes').querySelectorAll('tr')).map(tr => {
                const inputs = tr.querySelectorAll('input, select');
                return {
                    tiempo: parseInt(inputs[0].value) || 0,
                    motivo: inputs[1].value,
                    clasificacion: inputs[2].value
                };
            });

            const observaciones = document.getElementById('observaciones').value;
            if (checkObservacionesObligatorias() && !observaciones.trim()) {
                alert('Las observaciones son obligatorias si hay rechazos o desviaciones.');
                return;
            }

            data = {
                ...data,
                muestras_estructuradas,
                parametros_operativos,
                mezcla,
                produccion,
                desperdicio,
                incidentes,
                observaciones,
                isExtrusorPP: false // Por compatibilidad backend
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
                const error = await response.json();
                alert('Error al guardar: ' + (error.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error guardando:', error);
        }
    }

    function checkObservacionesObligatorias() {
        const selects = Array.from(document.querySelectorAll('.select-estado-muestra'));
        const hasProblem = selects.some(s => s.value === 'Rechazo' || s.value === 'Observación');
        const aviso = document.getElementById('aviso-obligatorio');
        if (aviso) aviso.style.display = hasProblem ? 'block' : 'none';
        return hasProblem;
    }

    // --- FUNCIONES COMUNES DE TABLAS ---

    function agregarProduccion(data = {}) {
        const tbody = document.getElementById('tbody-produccion');
        const tr = document.createElement('tr');
        const orderOptions = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden} - ${o.producto}</option>`).join('');
        tr.innerHTML = `
            <td><input type="text" class="form-control" placeholder="Máquina" value="${data.maquina || ''}"></td>
            <td><select class="form-control">${orderOptions}</select></td>
            <td><input type="number" class="form-control" placeholder="Kg" value="${data.cantidad || ''}"></td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger);border:none;background:none;cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => tr.remove();
    }

    function agregarDesperdicio(data = {}) {
        const tbody = document.getElementById('tbody-desperdicio');
        const tr = document.createElement('tr');
        const orderOptions = orders.map(o => `<option value="${o.id}" ${data.orden_id == o.id ? 'selected' : ''}>${o.codigo_orden}</option>`).join('');
        tr.innerHTML = `
            <td><input type="text" class="form-control" placeholder="Máquina" value="${data.maquina || ''}"></td>
            <td><select class="form-control">${orderOptions}</select></td>
            <td><input type="number" class="form-control" placeholder="Kg" value="${data.kg || ''}"></td>
            <td><input type="text" class="form-control" placeholder="Motivo" value="${data.motivo || ''}"></td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger);border:none;background:none;cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => tr.remove();
    }

    function agregarIncidente(data = {}) {
        const tbody = document.getElementById('tbody-incidentes');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="form-control" placeholder="Minutos" value="${data.tiempo || ''}"></td>
            <td><input type="text" class="form-control" placeholder="Motivo" value="${data.motivo || ''}"></td>
            <td>
                <select class="form-control">
                    <option value="Mecánica" ${data.clasificacion === 'Mecánica' ? 'selected' : ''}>Mecánica</option>
                    <option value="Eléctrica" ${data.clasificacion === 'Eléctrica' ? 'selected' : ''}>Eléctrica</option>
                    <option value="Operativa" ${data.clasificacion === 'Operativa' ? 'selected' : ''}>Operativa</option>
                    <option value="Calidad" ${data.clasificacion === 'Calidad' ? 'selected' : ''}>Calidad</option>
                </select>
            </td>
            <td><button class="btn-eliminar-fila" style="color:var(--danger);border:none;background:none;cursor:pointer;">×</button></td>
        `;
        tbody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').onclick = () => tr.remove();
    }

    // Botones globales
    document.getElementById('btn-agregar-produccion').onclick = () => agregarProduccion();
    document.getElementById('btn-agregar-desperdicio').onclick = () => agregarDesperdicio();
    document.getElementById('btn-agregar-incidente').onclick = () => agregarIncidente();
    document.getElementById('btn-guardar').onclick = () => guardar(false);
    document.getElementById('btn-guardar-volver').onclick = () => guardar(true);

    document.getElementById('select-operatividad').onchange = (e) => {
        const isNoOperativo = e.target.value === 'no_operativo';
        document.getElementById('group-motivo').style.display = isNoOperativo ? 'block' : 'none';
        document.getElementById('secciones-operativas').style.display = isNoOperativo ? 'none' : 'block';
    };
});
