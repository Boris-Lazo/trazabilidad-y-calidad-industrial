/**
 * Lógica para el módulo de importación masiva de órdenes desde SAP.
 */

const NOMBRES_PROCESO = {
    1: 'Extrusor PP',
    2: 'Telares',
    3: 'Laminado',
    4: 'Imprenta',
    5: 'Conversión SA',
    6: 'Extrusión PE',
    7: 'Conv. Liner PE',
    8: 'Peletizado',
    9: 'Sacos Vestidos'
};

const CAMPOS_PENDIENTES_LABELS = {
    costura_posicion: 'Posición de costura',
    con_fuelle: 'Con fuelle / plano',
    proceso_no_reconocido: 'Proceso no reconocido'
};

let ordenesNuevasCache = [];

function mostrarError(titulo, mensaje) {
    if (window.DesignSystem && typeof DesignSystem.showErrorModal === 'function') {
        DesignSystem.showErrorModal(titulo, mensaje);
    } else {
        // Fallback si DesignSystem no está disponible aún
        const modal = document.getElementById('modal-error-sap');
        const msg = document.getElementById('mensaje-error-sap');
        if (modal && msg) {
            msg.textContent = `${titulo}: ${mensaje}`;
            modal.style.display = 'flex';
        } else {
            alert(`${titulo}: ${mensaje}`);
        }
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('prod_sys_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const btnImportarSap = document.getElementById('btn-importar-sap');
    const modalImportar = document.getElementById('modal-importar');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnCerrarResultado = document.getElementById('btn-cerrar-resultado');
    const btnPrevisualizar = document.getElementById('btn-previsualizar');
    const btnVolverPaso1 = document.getElementById('btn-volver-paso1');
    const btnConfirmarImportacion = document.getElementById('btn-confirmar-importacion');
    const inputArchivoExcel = document.getElementById('input-archivo-excel');

    const paso1 = document.getElementById('paso-1');
    const paso2 = document.getElementById('paso-2');
    const paso3 = document.getElementById('paso-3');

    const resumenImportacion = document.getElementById('resumen-importacion');
    const tbodyPreview = document.getElementById('tbody-preview');
    const resultadoImportacion = document.getElementById('resultado-importacion');

    // Modal de Error y su lógica
    const modalErrorSap = document.getElementById('modal-error-sap');
    const mensajeErrorSap = document.getElementById('mensaje-error-sap');
    const botonesCerrarError = document.querySelectorAll('.btn-cerrar-error');

    function mostrarErrorModal(mensaje) {
        mensajeErrorSap.textContent = mensaje;
        modalErrorSap.classList.add('d-flex');
    }

    botonesCerrarError.forEach(btn => {
        btn.addEventListener('click', () => {
            modalErrorSap.classList.remove('d-flex');
        });
    });

    // Abrir modal
    btnImportarSap.addEventListener('click', () => {
        resetearModal();
        modalImportar.classList.add('d-flex');
    });

    // Cerrar modal
    const cerrarYRecargar = () => {
        modalImportar.classList.remove('d-flex');
        // Intentar encontrar cargarOrdenes en el scope global o disparar evento
        const event = new CustomEvent('ordenes-actualizadas');
        document.dispatchEvent(event);

        // Si existe la función en el scope de ordenes.js (que no es global por el DOMContentLoaded)
        // La mejor forma es recargar o usar el evento
        location.reload();
    };

    btnCerrarModal.addEventListener('click', cerrarYRecargar);
    btnCerrarResultado.addEventListener('click', cerrarYRecargar);

    // Volver al paso 1
    btnVolverPaso1.addEventListener('click', () => {
        paso2.classList.add('d-none');
        paso1.classList.remove('d-none');
    });

    // Previsualizar archivo
    btnPrevisualizar.addEventListener('click', async () => {
        const archivo = inputArchivoExcel.files[0];
        if (!archivo) {
            mostrarError('Archivo no seleccionado', 'Por favor selecciona un archivo Excel antes de continuar.');
            return;
        }

        const formData = new FormData();
        formData.append('archivo', archivo);

        btnPrevisualizar.disabled = true;
        btnPrevisualizar.innerHTML = '<i class="spinner"></i> Procesando...';

        try {
            const response = await fetch('/api/ordenes-produccion/importar/previsualizar', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders()
                },
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                renderizarPrevisualizacion(result.data);
                paso1.classList.add('d-none');
                paso2.classList.remove('d-none');
            } else {
                mostrarError('Error de Procesamiento', result.error || 'No se pudo procesar el archivo SAP.');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error de Conexión', 'Hubo un problema al conectar con el servidor para la previsualización.');
        } finally {
            btnPrevisualizar.disabled = false;
            btnPrevisualizar.innerHTML = '<i data-lucide="eye" class="icon-sm mr-1 v-middle"></i> Previsualizar';
            if (window.lucide) lucide.createIcons();
        }
    });

    // Confirmar importación
    btnConfirmarImportacion.addEventListener('click', async () => {
        const ordenesAEnviar = recolectarDatosTabla();

        btnConfirmarImportacion.disabled = true;
        btnConfirmarImportacion.innerHTML = '<i class="spinner"></i> Guardando...';

        try {
            const response = await fetch('/api/ordenes-produccion/importar/confirmar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ ordenes: ordenesAEnviar })
            });

            const result = await response.json();
            if (result.success) {
                const totalGuardadas = result.data.guardadas || 0;
                resultadoImportacion.innerHTML = `
                    <div class="alert alert-success d-flex align-center gap-2">
                        <i data-lucide="check-circle" class="icon-lg"></i>
                        <div>
                            <h4 class="m-0">Importación Exitosa</h4>
                            <p class="m-0 mt-1">Se importaron <strong>${totalGuardadas}</strong> órdenes nuevas correctamente.</p>
                            <p class="font-xs m-0 mt-1 opacity-08">PROD-SYS se mantuvo sin cambios para las órdenes ya existentes.</p>
                        </div>
                    </div>
                `;
                paso2.classList.add('d-none');
                paso3.classList.remove('d-none');
                if (window.lucide) lucide.createIcons();
            } else {
                // El backend devuelve 422 (DomainError) para errores de validación de negocio
                // Esto permite mostrar el error sin que auth.js cierre la sesión
                mostrarErrores(result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error de Importación', 'Hubo un fallo al intentar confirmar e importar las órdenes.');
        } finally {
            btnConfirmarImportacion.disabled = false;
            btnConfirmarImportacion.innerHTML = '<i data-lucide="check" class="icon-xs mr-1 v-middle"></i> Confirmar e Importar';
            if (window.lucide) lucide.createIcons();
        }
    });

    function resetearModal() {
        inputArchivoExcel.value = '';
        paso1.classList.remove('d-none');
        paso2.classList.add('d-none');
        paso3.classList.add('d-none');
        tbodyPreview.innerHTML = '';
        resumenImportacion.innerHTML = '';
        ordenesNuevasCache = [];
    }

    function renderizarPrevisualizacion(data) {
        ordenesNuevasCache = data.nuevas;

        // Resumen — agregar no_reconocidas al conteo
        resumenImportacion.innerHTML = `
            <div class="stat-card import-stat-card">
                <span class="import-stat-label">NUEVAS A IMPORTAR</span>
                <div class="import-stat-value text-primary">${data.nuevas.length}</div>
            </div>
            <div class="stat-card import-stat-card">
                <span class="import-stat-label">YA EN PROD-SYS</span>
                <div class="import-stat-value opacity-04">${data.ya_existentes.length}</div>
                <span class="import-stat-sub">No se modificarán</span>
            </div>
            <div class="stat-card import-stat-card">
                <span class="import-stat-label">REQUIEREN VALIDACIÓN</span>
                <div class="import-stat-value text-warning">${data.requieren_validacion}</div>
            </div>
            ${data.no_reconocidas.length > 0 ? `
            <div class="stat-card import-stat-card border-danger">
                <span class="import-stat-label">SERIES DESCONOCIDAS</span>
                <div class="import-stat-value text-error">${data.no_reconocidas.length}</div>
                <span class="import-stat-sub">Ver detalle abajo</span>
            </div>` : ''}
        `;

        // Tabla de órdenes nuevas
        tbodyPreview.innerHTML = '';
        data.nuevas.forEach((orden, index) => {
            const tr = document.createElement('tr');
            if (orden.requiere_validacion) {
                tr.classList.add('border-l-warning');
            }

            const fechaVenc = orden.fecha_vencimiento ? new Date(orden.fecha_vencimiento).toLocaleDateString() : '-';

            // Generar lista de especificaciones editables
            let especHtml = '<div class="espec-list">';
            for (const [key, val] of Object.entries(orden.especificaciones)) {
                if (key.startsWith('nota_')) continue;
                especHtml += `<div class="espec-item" data-key="${key}">
                    <span class="text-primary">${key}:</span>
                    <span class="editable-val" contenteditable="true">${val}</span>
                </div>`;
            }
            especHtml += '</div>';

            // Generar controles para campos pendientes
            let pendientesHtml = '';
            orden.campos_pendientes.forEach(campo => {
                if (campo === 'costura_posicion') {
                    pendientesHtml += `
                        <div class="form-group mb-0">
                            <label class="font-xs m-0">${CAMPOS_PENDIENTES_LABELS[campo]}</label>
                            <select class="form-control select-pendiente" data-campo="costura_posicion">
                                <option value="" disabled selected>Elegir...</option>
                                <option value="arriba">Arriba</option>
                                <option value="abajo">Abajo</option>
                            </select>
                        </div>
                    `;
                } else if (campo === 'con_fuelle') {
                    pendientesHtml += `
                        <div class="form-group mb-0">
                            <label class="font-xs m-0">${CAMPOS_PENDIENTES_LABELS[campo]}</label>
                            <select class="form-control select-pendiente" data-campo="con_fuelle">
                                <option value="" disabled selected>Elegir...</option>
                                <option value="true">Con fuelle</option>
                                <option value="false">Plano</option>
                            </select>
                        </div>
                    `;
                } else {
                    pendientesHtml += `<span class="badge badge-warning font-xs">${CAMPOS_PENDIENTES_LABELS[campo] || campo}</span>`;
                }
            });

            tr.innerHTML = `
                <td>${orden.codigo_orden}</td>
                <td class="font-sm">${NOMBRES_PROCESO[orden.proceso_id] || 'N/A'}</td>
                <td class="mw-200 font-sm ws-normal">${orden.descripcion_producto}</td>
                <td>${orden.cantidad_planificada}</td>
                <td>${fechaVenc}</td>
                <td>${especHtml}</td>
                <td>${pendientesHtml}</td>
            `;
            tr.dataset.index = index;
            tbodyPreview.appendChild(tr);
        });

        // Sección de ya_existentes (informativa, colapsable)
        const seccionExistentes = document.getElementById('seccion-ya-existentes');
        if (seccionExistentes) {
            if (data.ya_existentes.length > 0) {
                seccionExistentes.classList.remove('d-none');
                const tbodyExist = document.getElementById('tbody-ya-existentes');
                tbodyExist.innerHTML = data.ya_existentes.map(e => `
                    <tr>
                        <td>${e.codigo_orden}</td>
                        <td><span class="badge badge-outline">${e.estado_prodsys}</span></td>
                        <td class="font-sm text-muted">${e.sap_cantidad_planificada?.toLocaleString() || '-'}</td>
                        <td class="font-sm text-muted">${e.sap_fecha_vencimiento || '-'}</td>
                        <td class="font-sm text-success">✓ PROD-SYS actualizado</td>
                    </tr>
                `).join('');
            } else {
                seccionExistentes.classList.add('d-none');
            }
        }

        // Sección de no_reconocidas (alerta)
        const seccionNoReconocidas = document.getElementById('seccion-no-reconocidas');
        if (seccionNoReconocidas) {
            if (data.no_reconocidas.length > 0) {
                seccionNoReconocidas.classList.remove('d-none');
                const tbodyNR = document.getElementById('tbody-no-reconocidas');
                tbodyNR.innerHTML = data.no_reconocidas.map(e => `
                    <tr>
                        <td>${e.codigo_orden}</td>
                        <td class="text-error">${e.nombre_proceso_sap}</td>
                        <td class="font-sm">${e.descripcion_producto}</td>
                        <td class="font-sm text-muted">${e.motivo}</td>
                    </tr>
                `).join('');
            } else {
                seccionNoReconocidas.classList.add('d-none');
            }
        }
    }

    function recolectarDatosTabla() {
        const filas = tbodyPreview.querySelectorAll('tr');
        const ordenesActualizadas = [];

        filas.forEach(tr => {
            const index = tr.dataset.index;
            const orden = JSON.parse(JSON.stringify(ordenesNuevasCache[index]));

            // Recolectar especificaciones editadas (inline contenteditable)
            const especItems = tr.querySelectorAll('.espec-item');
            especItems.forEach(item => {
                const key = item.dataset.key;
                const val = item.querySelector('.editable-val').innerText.trim();
                // Intentar convertir a número si parece número
                if (!isNaN(val) && val !== '') {
                    orden.especificaciones[key] = parseFloat(val);
                } else {
                    orden.especificaciones[key] = val;
                }
            });

            // Recolectar campos pendientes (selects)
            const selects = tr.querySelectorAll('.select-pendiente');
            selects.forEach(sel => {
                const campo = sel.dataset.campo;
                const val = sel.value;

                if (campo === 'costura_posicion') {
                    orden.especificaciones.costura_posicion = val || null;
                } else if (campo === 'con_fuelle') {
                    if (val === 'true') orden.especificaciones.con_fuelle = true;
                    else if (val === 'false') orden.especificaciones.con_fuelle = false;
                    else orden.especificaciones.con_fuelle = null;
                }
            });

            ordenesActualizadas.push(orden);
        });

        return ordenesActualizadas;
    }

    function mostrarErrores(error) {
        resultadoImportacion.innerHTML = `
            <div class="alert alert-danger">
                <h4 class="m-0">Errores de Validación</h4>
                <div class="import-results-container">
                    ${error.split(';').map(e => `<div>• ${e.trim()}</div>`).join('')}
                </div>
            </div>
        `;
        paso2.classList.add('d-none');
        paso3.classList.remove('d-none');
    }
});
