
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

        // Ajustar labels de orden si es necesario
        // Pero el orden ya está en el HTML

        // Inicializar Temperaturas (12)
        const gridTemps = document.getElementById('grid-temperaturas');
        for (let i = 1; i <= 12; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label style="font-size: 0.7rem;">Z${i}</label>
                <input type="number" class="form__input input-temp" data-zona="${i}" placeholder="0">
            `;
            gridTemps.appendChild(div);
        }

        // Inicializar Materias Pras (6 filas)
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
            if (e.target.id === 'rpm-tornillo' || e.target.id === 'ratio-stretching') {
                calcularVelocidadEmbobinadores();
            }
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
                document.getElementById('group-motivo').style.display = 'block';
                document.getElementById('motivo-no-operativo').value = data.motivo_no_operativo;
                document.getElementById('secciones-operativas').style.display = 'none';
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

                // Cargar parámetros operativos
                if (data.parametros_operativos) {
                    const po = data.parametros_operativos;
                    const tempInputs = document.querySelectorAll('.input-temp');
                    po.temperaturas?.forEach((t, i) => { if(tempInputs[i]) tempInputs[i].value = t; });
                    document.getElementById('temp-pila').value = po.temp_pila || '';
                    document.getElementById('temp-horno').value = po.temp_horno || '';
                    document.getElementById('rpm-tornillo').value = po.rpm_tornillo || '';
                    document.getElementById('presion-bar').value = po.presion_bar || '';
                    document.getElementById('ratio-top-roller').value = po.ratio_top_roller || '';
                    document.getElementById('ratio-holding').value = po.ratio_holding || '';
                    document.getElementById('ratio-annealing').value = po.ratio_annealing || '';
                    document.getElementById('ratio-stretching').value = po.ratio_stretching || '';
                    calcularVelocidadEmbobinadores();
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

    function calcularVelocidadEmbobinadores() {
        const rpm = parseFloat(document.getElementById('rpm-tornillo').value) || 0;
        const stretch = parseFloat(document.getElementById('ratio-stretching').value) || 0;
        // Formula simplificada para el sistema: RPM * Factor * Stretch
        // Usamos un factor de 0.5 como ejemplo, idealmente vendría de configuración.
        const velocidad = rpm * 0.5 * stretch;
        document.getElementById('velocidad-embobinadores').value = velocidad.toFixed(2);
    }

    // --- MANEJO DE FILAS ---

    function agregarMuestraExtrusor(data = {}) {
        const tbody = document.getElementById('tbody-calidad-extrusor');
        const tr = document.createElement('tr');
        const index = tbody.children.length + 1;
        tr.innerHTML = `
            <td>${index}</td>
            <td><input type="number" class="form__input input-denier" value="${data.denier || ''}" step="0.1"></td>
            <td><input type="number" class="form__input input-resistencia" value="${data.resistencia || ''}" step="0.1"></td>
            <td><input type="number" class="form__input input-elongacion" value="${data.elongacion || ''}" step="0.1"></td>
            <td><input type="number" class="form__input input-tenacidad" value="${data.tenacidad || ''}" readonly style="background: rgba(255,255,255,0.05);"></td>
            <td><input type="number" class="form__input input-ancho" value="${data.ancho || ''}" step="0.1"></td>
            <td>
                <select class="form__input select-color">
                    <option value="Aceptable" ${data.color === 'Aceptable' ? 'selected' : ''}>Aceptable</option>
                    <option value="Observación" ${data.color === 'Observación' ? 'selected' : ''}>Observación</option>
                    <option value="Rechazo" ${data.color === 'Rechazo' ? 'selected' : ''}>Rechazo</option>
                </select>
            </td>
            <td><button class="button button-outline btn-eliminar-fila" style="color: var(--danger);">×</button></td>
        `;
        tbody.appendChild(tr);

        // Listener para Tenacidad
        const updateTenacidad = () => {
            const denier = parseFloat(tr.querySelector('.input-denier').value) || 0;
            const res = parseFloat(tr.querySelector('.input-resistencia').value) || 0;
            if (denier > 0) {
                tr.querySelector('.input-tenacidad').value = (res / denier).toFixed(2);
            }
        };
        tr.querySelector('.input-denier').addEventListener('input', updateTenacidad);
        tr.querySelector('.input-resistencia').addEventListener('input', updateTenacidad);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());

        tr.querySelector('.select-color').addEventListener('change', checkObservacionesObligatorias);
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
        tr.querySelector('.select-resultado').addEventListener('change', checkObservacionesObligatorias);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
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
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
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
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
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
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
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
            const colores = Array.from(document.querySelectorAll('.select-color')).map(s => s.value);
            hasProblem = colores.some(c => c === 'Rechazo' || c === 'Observación');
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

        if (isNoOperativo && !motivoNoOperativo.trim()) {
            alert('Debe indicar el motivo por el cual el proceso no es operativo.');
            return;
        }

        let data = {
            bitacora_id: currentBitacora.id,
            proceso_id: procesoId,
            no_operativo: isNoOperativo,
            motivo_no_operativo: motivoNoOperativo,
            isExtrusorPP // Flag para que el backend sepa cómo procesar
        };

        if (!isNoOperativo) {
            // Recolectar datos según tipo de proceso
            if (isExtrusorPP) {
                const muestras = Array.from(document.getElementById('tbody-calidad-extrusor').querySelectorAll('tr')).map(tr => {
                    const inputs = tr.querySelectorAll('input, select');
                    return {
                        denier: inputs[0].value,
                        resistencia: inputs[1].value,
                        elongacion: inputs[2].value,
                        tenacidad: inputs[3].value,
                        ancho: inputs[4].value,
                        color: inputs[5].value
                    };
                });

                const temperaturas = Array.from(document.querySelectorAll('.input-temp')).map(input => input.value);

                const parametros_operativos = {
                    temperaturas,
                    temp_pila: document.getElementById('temp-pila').value,
                    temp_horno: document.getElementById('temp-horno').value,
                    rpm_tornillo: document.getElementById('rpm-tornillo').value,
                    presion_bar: document.getElementById('presion-bar').value,
                    ratio_top_roller: document.getElementById('ratio-top-roller').value,
                    ratio_holding: document.getElementById('ratio-holding').value,
                    ratio_annealing: document.getElementById('ratio-annealing').value,
                    ratio_stretching: document.getElementById('ratio-stretching').value,
                    velocidad_embobinadores: document.getElementById('velocidad-embobinadores').value
                };

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

                data = { ...data, muestras_estructuradas: muestras, parametros_operativos, mezcla, incidentes };
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
        document.getElementById('secciones-operativas').style.display = isNoOperativo ? 'none' : 'block';
    });
});
