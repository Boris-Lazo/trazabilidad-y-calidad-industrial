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
        return;
    }
    // Fallback DOM: modal estático en la página
    const modal = document.getElementById('modal-error-sap');
    const msg = document.getElementById('mensaje-error-sap');
    if (modal && msg) {
        msg.textContent = `${titulo}: ${mensaje}`;
        modal.style.display = 'flex';
        return;
    }
    // Fallback final: consola
    console.error(`[${titulo}] ${mensaje}`);
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
        modalErrorSap.style.display = 'flex';
    }

    botonesCerrarError.forEach(btn => {
        btn.addEventListener('click', () => {
            modalErrorSap.style.display = 'none';
        });
    });

    // Abrir modal
    btnImportarSap.addEventListener('click', () => {
        resetearModal();
        modalImportar.style.display = 'flex';
    });

    // Cerrar modal
    const cerrarYRecargar = () => {
        modalImportar.style.display = 'none';
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
        paso2.style.display = 'none';
        paso1.style.display = 'block';
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
                paso1.style.display = 'none';
                paso2.style.display = 'block';
            } else {
                mostrarError('Error de Procesamiento', result.error || 'No se pudo procesar el archivo SAP.');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error de Conexión', 'Hubo un problema al conectar con el servidor para la previsualización.');
        } finally {
            btnPrevisualizar.disabled = false;
            btnPrevisualizar.innerHTML = '<i data-lucide="eye" style="width:16px; height:16px; margin-right:8px; vertical-align:middle;"></i> Previsualizar';
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
                    <div class="alert alert-success" style="display:flex; align-items:center; gap:12px;">
                        <i data-lucide="check-circle" style="width:24px; height:24px;"></i>
                        <div>
                            <h4 style="margin:0">Importación Exitosa</h4>
                            <p style="margin:4px 0 0 0">Se importaron <strong>${totalGuardadas}</strong> órdenes nuevas correctamente.</p>
                            <p style="font-size:12px; margin:4px 0 0 0; opacity:0.8;">PROD-SYS se mantuvo sin cambios para las órdenes ya existentes.</p>
                        </div>
                    </div>
                `;
                paso2.style.display = 'none';
                paso3.style.display = 'block';
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
            btnConfirmarImportacion.innerHTML = '<i data-lucide="check" style="width:14px; height:14px; margin-right:6px; vertical-align:middle;"></i> Confirmar e Importar';
            if (window.lucide) lucide.createIcons();
        }
    });

    function resetearModal() {
        inputArchivoExcel.value = '';
        paso1.style.display = 'block';
        paso2.style.display = 'none';
        paso3.style.display = 'none';
        tbodyPreview.innerHTML = '';
        resumenImportacion.innerHTML = '';
        ordenesNuevasCache = [];
    }

    function renderizarPrevisualizacion(data) {
        ordenesNuevasCache = data.nuevas;

        // Resumen — agregar no_reconocidas al conteo
        resumenImportacion.innerHTML = `
            <div class="stat-card" style="padding:12px; flex:1; min-width:130px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.1)">
                <span style="font-size:11px; color:rgba(255,255,255,0.5)">NUEVAS A IMPORTAR</span>
                <div style="font-size:20px; font-weight:bold; color:var(--primary-color)">${data.nuevas.length}</div>
            </div>
            <div class="stat-card" style="padding:12px; flex:1; min-width:130px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.1)">
                <span style="font-size:11px; color:rgba(255,255,255,0.5)">YA EN PROD-SYS</span>
                <div style="font-size:20px; font-weight:bold; color:rgba(255,255,255,0.4)">${data.ya_existentes.length}</div>
                <span style="font-size:10px; color:rgba(255,255,255,0.3)">No se modificarán</span>
            </div>
            <div class="stat-card" style="padding:12px; flex:1; min-width:130px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.1)">
                <span style="font-size:11px; color:rgba(255,255,255,0.5)">REQUIEREN VALIDACIÓN</span>
                <div style="font-size:20px; font-weight:bold; color:var(--warning-color)">${data.requieren_validacion}</div>
            </div>
            ${data.no_reconocidas.length > 0 ? `
            <div class="stat-card" style="padding:12px; flex:1; min-width:130px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(239,68,68,0.4)">
                <span style="font-size:11px; color:rgba(255,255,255,0.5)">SERIES DESCONOCIDAS</span>
                <div style="font-size:20px; font-weight:bold; color:var(--danger-color, #ef4444)">${data.no_reconocidas.length}</div>
                <span style="font-size:10px; color:rgba(255,255,255,0.3)">Ver detalle abajo</span>
            </div>` : ''}
        `;

        // Tabla de órdenes nuevas
        tbodyPreview.innerHTML = '';
        data.nuevas.forEach((orden, index) => {
            const tr = document.createElement('tr');
            if (orden.requiere_validacion) {
                tr.style.borderLeft = '4px solid var(--warning-color)';
            }

            const fechaVenc = orden.fecha_vencimiento ? new Date(orden.fecha_vencimiento).toLocaleDateString() : '-';

            // Generar lista de especificaciones editables
            let especHtml = '<div class="espec-list" style="font-size:11px; color:rgba(255,255,255,0.7)">';
            for (const [key, val] of Object.entries(orden.especificaciones)) {
                if (key.startsWith('nota_')) continue;
                especHtml += `<div class="espec-item" data-key="${key}">
                    <span style="color:var(--primary-color)">${key}:</span>
                    <span class="editable-val" contenteditable="true" style="border-bottom:1px dashed #666; padding:0 2px">${val}</span>
                </div>`;
            }
            especHtml += '</div>';

            // Generar controles para campos pendientes
            let pendientesHtml = '';
            orden.campos_pendientes.forEach(campo => {
                if (campo === 'costura_posicion') {
                    pendientesHtml += `
                        <div class="form-group" style="margin:0">
                            <label style="font-size:10px; margin:0">${CAMPOS_PENDIENTES_LABELS[campo]}</label>
                            <select class="form-control select-pendiente" data-campo="costura_posicion" style="padding:2px 4px; height:24px; font-size:11px;">
                                <option value="" disabled selected>Elegir...</option>
                                <option value="arriba">Arriba</option>
                                <option value="abajo">Abajo</option>
                            </select>
                        </div>
                    `;
                } else if (campo === 'con_fuelle') {
                    pendientesHtml += `
                        <div class="form-group" style="margin:0">
                            <label style="font-size:10px; margin:0">${CAMPOS_PENDIENTES_LABELS[campo]}</label>
                            <select class="form-control select-pendiente" data-campo="con_fuelle" style="padding:2px 4px; height:24px; font-size:11px;">
                                <option value="" disabled selected>Elegir...</option>
                                <option value="true">Con fuelle</option>
                                <option value="false">Plano</option>
                            </select>
                        </div>
                    `;
                } else {
                    pendientesHtml += `<span class="badge badge-warning" style="font-size:10px">${CAMPOS_PENDIENTES_LABELS[campo] || campo}</span>`;
                }
            });

            tr.innerHTML = `
                <td>${orden.codigo_orden}</td>
                <td style="font-size:11px">${NOMBRES_PROCESO[orden.proceso_id] || 'N/A'}</td>
                <td style="max-width:200px; font-size:11px; white-space:normal">${orden.descripcion_producto}</td>
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
                seccionExistentes.style.display = 'block';
                const tbodyExist = document.getElementById('tbody-ya-existentes');
                tbodyExist.innerHTML = data.ya_existentes.map(e => `
                    <tr>
                        <td>${e.codigo_orden}</td>
                        <td><span class="badge badge-outline">${e.estado_prodsys}</span></td>
                        <td style="font-size:11px; color:rgba(255,255,255,0.5)">${e.sap_cantidad_planificada?.toLocaleString() || '-'}</td>
                        <td style="font-size:11px; color:rgba(255,255,255,0.5)">${e.sap_fecha_vencimiento || '-'}</td>
                        <td style="font-size:11px; color:var(--success-color, #22c55e)">✓ PROD-SYS actualizado</td>
                    </tr>
                `).join('');
            } else {
                seccionExistentes.style.display = 'none';
            }
        }

        // Sección de no_reconocidas (alerta)
        const seccionNoReconocidas = document.getElementById('seccion-no-reconocidas');
        if (seccionNoReconocidas) {
            if (data.no_reconocidas.length > 0) {
                seccionNoReconocidas.style.display = 'block';
                const tbodyNR = document.getElementById('tbody-no-reconocidas');
                tbodyNR.innerHTML = data.no_reconocidas.map(e => `
                    <tr>
                        <td>${e.codigo_orden}</td>
                        <td style="color:var(--danger-color, #ef4444)">${e.nombre_proceso_sap}</td>
                        <td style="font-size:11px">${e.descripcion_producto}</td>
                        <td style="font-size:11px; color:rgba(255,255,255,0.5)">${e.motivo}</td>
                    </tr>
                `).join('');
            } else {
                seccionNoReconocidas.style.display = 'none';
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
                <h4 style="margin:0">Errores de Validación</h4>
                <div style="margin-top:8px; font-size:13px; max-height:200px; overflow-y:auto">
                    ${error.split(';').map(e => `<div>• ${e.trim()}</div>`).join('')}
                </div>
            </div>
        `;
        paso2.style.display = 'none';
        paso3.style.display = 'block';
    }
});
