
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const procesoId = urlParams.get('procesoId');
    const bitacoraId = urlParams.get('bitacoraId');

    const loader = document.getElementById('loader');
    const container = document.getElementById('registro-container');
    const titulo = document.getElementById('proceso-titulo');
    const form = document.getElementById('form-registro');

    const camposCalidad = document.getElementById('campos-calidad');
    const unidadMedida = document.getElementById('unidad-medida');
    const selectMaquina = document.getElementById('select-maquina');
    const selectOrden = document.getElementById('select-orden');
    const horaMuestra = document.getElementById('hora-muestra');

    let procesoData = null;
    let existingRegistro = null;

    // Actualizar hora cada minuto
    function updateTime() {
        const now = new Date();
        horaMuestra.textContent = `Hora: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
    updateTime();
    setInterval(updateTime, 60000);

    async function init() {
        if (!procesoId || !bitacoraId) {
            alert('Faltan parámetros de proceso o bitácora');
            window.location.href = '/bitacora.html';
            return;
        }

        try {
            // Cargar datos del proceso
            const resProceso = await fetch(`/api/procesos-tipo/${procesoId}`);
            procesoData = await resProceso.json();

            titulo.textContent = `Registro: ${procesoData.nombre}`;
            unidadMedida.textContent = procesoData.unidad_produccion || 'unidades';

            // Cargar Máquinas (Simulado o desde API de recursos)
            const resMaquinas = await fetch('/api/recursos?tipo=maquina');
            const maquinas = await resMaquinas.json();
            maquinas.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.nombre;
                selectMaquina.appendChild(opt);
            });

            // Cargar Órdenes Activas
            const resOrdenes = await fetch('/api/ordenes-produccion');
            const ordenes = await resOrdenes.json();
            ordenes.filter(o => o.estado === 'en proceso' || o.estado === 'abierta').forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.id;
                opt.textContent = `${o.codigo_orden} - ${o.producto}`;
                selectOrden.appendChild(opt);
            });

            configurarCamposCalidad(procesoData.nombre);

            // Buscar si ya existe un registro para esta bitácora y proceso
            const resExistente = await fetch(`/api/registros-trabajo/search?bitacoraId=${bitacoraId}&procesoId=${procesoId}`);
            existingRegistro = await resExistente.json();

            if (existingRegistro) {
                cargarDatosExistentes(existingRegistro);
            }

            loader.style.display = 'none';
            container.style.display = 'block';

        } catch (error) {
            console.error('Error inicializando registro:', error);
        }
    }

    function configurarCamposCalidad(nombreProceso) {
        camposCalidad.innerHTML = '';

        const config = {
            'Extrusor PP': [
                { label: 'Ancho (mm)', type: 'number' },
                { label: 'Espesor (micras)', type: 'number' },
                { label: 'Tensión (N)', type: 'number' }
            ],
            'Telares': [
                { label: 'Ancho (cm)', type: 'number' },
                { label: 'Pasadas por pulgada', type: 'number' },
                { label: 'Defectos visuales', type: 'select', options: ['Ninguno', 'Hebra suelta', 'Mancha Aceite'] }
            ],
            'Imprenta': [
                { label: 'Adherencia Tinta', type: 'select', options: ['Excelente', 'Aceptable', 'Pobre'] },
                { label: 'Tono de Color', type: 'select', options: ['OK', 'Fuera de rango'] },
                { label: 'Centrado', type: 'number' }
            ]
        };

        const campos = config[nombreProceso] || [
            { label: 'Parámetro Visual', type: 'select', options: ['OK', 'No OK'] },
            { label: 'Medición Estándar', type: 'number' }
        ];

        campos.forEach(c => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `<label>${c.label}</label>`;

            if (c.type === 'select') {
                const select = document.createElement('select');
                c.options.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt.toLowerCase();
                    o.textContent = opt;
                    select.appendChild(o);
                });
                group.appendChild(select);
            } else {
                const input = document.createElement('input');
                input.type = 'number';
                input.placeholder = '0.00';
                group.appendChild(input);
            }
            camposCalidad.appendChild(group);
        });
    }

    function cargarDatosExistentes(reg) {
        document.getElementById('cantidad-producida').value = reg.cantidad_producida;
        document.getElementById('merma-kg').value = reg.merma_kg;
        document.getElementById('observaciones').value = reg.observaciones;

        const params = JSON.parse(reg.parametros || '{}');
        if (params.grado_aceptacion) document.getElementById('grado-aceptacion').value = params.grado_aceptacion;
        if (params.motivo_merma) document.getElementById('motivo-merma').value = params.motivo_merma;

        // El título cambia para indicar que es edición
        titulo.textContent += ' (Editar)';

        cargarHistorial(reg.id);
    }

    async function cargarHistorial(id) {
        try {
            const res = await fetch(`/api/registros-trabajo/${id}/history`);
            const history = await res.json();

            if (history.length > 0) {
                const section = document.getElementById('section-history');
                const body = document.getElementById('history-body');
                body.innerHTML = '';
                history.forEach(h => {
                    body.innerHTML += `
                        <tr>
                            <td>${new Date(h.fecha_hora).toLocaleString()}</td>
                            <td>${h.usuario}</td>
                            <td>${h.detalles}</td>
                        </tr>
                    `;
                });
                section.style.display = 'block';
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (existingRegistro) {
            document.getElementById('modal-motivo').style.display = 'flex';
        } else {
            await guardarRegistro();
        }
    });

    document.getElementById('btn-confirmar-guardar').addEventListener('click', async () => {
        const motivo = document.getElementById('motivo-correccion').value;
        if (!motivo) {
            alert('El motivo es obligatorio para correcciones');
            return;
        }
        await guardarRegistro(motivo);
    });

    document.getElementById('btn-cancelar-motivo').addEventListener('click', () => {
        document.getElementById('modal-motivo').style.display = 'none';
    });

    async function guardarRegistro(motivo = null) {
        const data = {
            bitacora_id: bitacoraId,
            linea_ejecucion_id: existingRegistro ? existingRegistro.linea_ejecucion_id : 1,
            cantidad_producida: document.getElementById('cantidad-producida').value,
            merma_kg: document.getElementById('merma-kg').value,
            observaciones: document.getElementById('observaciones').value,
            parametros: JSON.stringify({
                grado_aceptacion: document.getElementById('grado-aceptacion').value,
                motivo_merma: document.getElementById('motivo-merma').value
            }),
            estado: 'completado'
        };

        if (motivo) data.motivo = motivo;

        try {
            const url = existingRegistro ? `/api/registros-trabajo/${existingRegistro.id}` : '/api/registros-trabajo';
            const method = existingRegistro ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                window.location.href = '/bitacora.html';
            } else {
                const error = await res.json();
                alert('Error: ' + error.message);
            }
        } catch (error) {
            console.error('Error guardando registro:', error);
        }
    }

    init();
});
