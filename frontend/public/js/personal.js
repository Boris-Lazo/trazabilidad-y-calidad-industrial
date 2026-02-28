/**
 * GESTIÓN DE PERSONAL - PROD-SYS
 */

const PersonalModule = {
    staff: [],
    areas: [],
    roles: [],
    mappingAreaRoles: {
        'Administración': [
            'Gerente General',
            'Superintendente de Producción',
            'Jefe de Operaciones',
            'Supervisor de Seguridad y Salud Ocupacional',
            'Digitador'
        ],
        'Departamento de Calidad': [
            'Inspector de Calidad'
        ],
        'Mantenimiento': [
            'Mecatrónico',
            'Auxiliar de Mantenimiento'
        ],
        'Producción': [
            'Técnico Operador',
            'Auxiliar de Operaciones'
        ]
    },
    processes: [],
    machines: [],
    currentStaffId: null,
    currentView: 'lista',

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentView = urlParams.get('view') || 'lista';
        this.applyViewAdjustments();

        await this.loadCatalogs();
        await this.loadStaff();
        this.setupEventListeners();
    },

    applyViewAdjustments() {
        const title = document.getElementById('page-title');
        if (this.currentView === 'usuarios') {
            if (title) title.textContent = 'Gestión de Usuarios';
        } else {
            if (title) title.textContent = 'Gestión de Colaboradores';
        }
    },

    async loadCatalogs() {
        try {
            const res = await fetch('/api/personal/catalogos');
            const result = await res.json();
            if (result.success) {
                // Filtrar áreas permitidas por el dominio
                const allowedAreaNames = Object.keys(this.mappingAreaRoles);
                this.areas = result.data.areas.filter(a => allowedAreaNames.includes(a.nombre));
                this.roles = result.data.roles;
                this.renderCatalogSelects();
            }

            const resProc = await fetch('/api/bitacora/procesos');
            const resultProc = await resProc.json();
            if (resultProc.success) {
                this.processes = resultProc.data;
                const select = document.getElementById('a-proceso');
                if (select) {
                    select.innerHTML = '<option value="">Seleccione proceso...</option>' +
                        this.processes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
                }
            }
        } catch (error) {
            console.error('Error al cargar catálogos:', error);
        }
    },

    renderCatalogSelects() {
        const areaSelect = document.getElementById('p-area');
        const filterAreaSelect = document.getElementById('filter-area');

        if (areaSelect) {
            areaSelect.innerHTML = '<option value="">Seleccione área...</option>' +
                this.areas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
        }

        if (filterAreaSelect) {
            filterAreaSelect.innerHTML = '<option value="">Todas</option>' +
                this.areas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
        }
    },

    updateOrganizationalRoles(areaId) {
        const rolSelect = document.getElementById('p-rol-org');
        if (!rolSelect) return;

        if (!areaId) {
            rolSelect.innerHTML = '<option value="">Seleccione área primero...</option>';
            rolSelect.disabled = true;
            return;
        }

        const area = this.areas.find(a => a.id == areaId);
        const areaName = area ? area.nombre : '';
        const roles = this.mappingAreaRoles[areaName] || [];

        rolSelect.innerHTML = roles.map(r => `<option value="${r}">${r}</option>`).join('');
        rolSelect.disabled = roles.length === 0;
    },

    async loadStaff() {
        try {
            const res = await fetch('/api/personal');
            const result = await res.json();
            if (result.success) {
                this.staff = result.data;
                this.renderStaffList();
            }
        } catch (error) {
            DesignSystem.showToast('Error al cargar personal', 'error');
        }
    },

    renderStaffList() {
        const tbody = document.getElementById('lista-personal');
        const searchTerm = document.getElementById('search-staff').value.toLowerCase();
        const areaFilter = document.getElementById('filter-area').value;
        const user = Auth.getUser();

        // Reglas de permisos estrictas: Solo Admin y Jefe de Operaciones pueden editar/gestionar acceso
        const canManage = user && (user.rol === 'Administrador' || user.rol === 'Jefe de Operaciones');
        const isReadOnly = !canManage;

        if (isReadOnly) {
            const btnNuevo = document.getElementById('btn-nuevo-personal');
            if (btnNuevo) btnNuevo.style.display = 'none';
            if (!document.getElementById('readonly-notice')) {
                const notice = document.createElement('div');
                notice.id = 'readonly-notice';
                notice.className = 'badge badge-warning mb-3 w-100';
                notice.style.padding = '10px';
                notice.innerHTML = '<i data-lucide="info" style="width:14px; height:14px; vertical-align:middle; margin-right:8px;"></i> Información histórica y no editable para Inspectores.';
                tbody.closest('.card').parentElement.insertBefore(notice, tbody.closest('.card'));
                DesignSystem.initLucide();
            }
        }

        const filtered = this.staff.filter(p => {
            const matchesSearch = p.nombre.toLowerCase().includes(searchTerm) ||
                                 p.apellido.toLowerCase().includes(searchTerm) ||
                                 p.codigo_interno.toLowerCase().includes(searchTerm);
            const matchesArea = !areaFilter || p.area_id == areaFilter;
            return matchesSearch && matchesArea;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-secondary">No se encontró personal</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const isAuxActive = p.es_auxiliar_activo;
            const rowStyle = isAuxActive ? 'background-color: rgba(30, 64, 175, 0.05); border-left: 4px solid var(--primary-base);' : '';

            return `
            <tr style="${rowStyle}">
                <td>
                    <strong>${p.codigo_interno}</strong>
                    ${isAuxActive ? '<br><small class="text-primary" style="font-weight:600;">Auxiliar con Acceso</small>' : ''}
                </td>
                <td>${p.nombre} ${p.apellido}</td>
                <td>${p.area_nombre}</td>
                <td><span class="badge badge-info">${p.rol_organizacional || 'Sin Rol'}</span></td>
                <td>
                    <span class="badge ${p.estado_laboral.toLowerCase() === 'activo' ? 'badge-success' : 'badge-danger'}">
                        ${p.estado_laboral.toUpperCase()}
                    </span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge ${p.estado_usuario && p.estado_usuario.toLowerCase() === 'activo' ? 'badge-success' : 'badge-warning'}">
                            ${(p.estado_usuario || 'S/U').toUpperCase()}
                        </span>
                        ${canManage && p.estado_usuario !== 'Baja lógica' ? `
                        <button class="btn btn-secondary btn-sm" onclick="PersonalModule.openStatusModal(${p.id}, '${p.nombre} ${p.apellido}', '${p.estado_usuario || 'Inactivo'}')" title="Estado / Acceso">
                            <i data-lucide="shield" style="width:14px; height:14px;"></i>
                        </button>` : ''}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        ${canManage && p.estado_usuario !== 'Baja lógica' ? `
                        <button class="btn btn-secondary btn-sm" onclick="PersonalModule.openModal(${p.id})" title="Editar">
                            <i data-lucide="pencil" style="width:14px; height:14px;"></i>
                        </button>` : ''}
                        <button class="btn btn-secondary btn-sm" onclick="PersonalModule.viewDetails(${p.id})" title="Ver Detalle">
                            <i data-lucide="eye" style="width:14px; height:14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
        DesignSystem.initLucide();
    },

    setupEventListeners() {
        const btnNuevo = document.getElementById('btn-nuevo-personal');
        if (btnNuevo) btnNuevo.addEventListener('click', () => this.openModal());

        document.getElementById('search-staff').addEventListener('input', () => this.renderStaffList());
        document.getElementById('filter-area').addEventListener('change', () => this.renderStaffList());
        document.getElementById('btn-save-personal').addEventListener('click', () => this.saveStaff());

        const pArea = document.getElementById('p-area');
        if (pArea) {
            pArea.addEventListener('change', (e) => this.updateOrganizationalRoles(e.target.value));
        }

        const btnSaveAsig = document.getElementById('btn-save-assignment');
        if (btnSaveAsig) btnSaveAsig.addEventListener('click', () => this.saveAssignment());

        document.getElementById('btn-confirm-status').addEventListener('click', () => this.saveStatusChange());

        const uEstado = document.getElementById('u-estado');
        if (uEstado) {
            uEstado.addEventListener('change', (e) => {
                const p = this.staff.find(s => s.id === this.currentStaffId);
                const warning = document.getElementById('status-warning');
                if (e.target.value === 'Baja lógica') {
                    warning.style.display = 'block';
                    warning.innerHTML = '<strong>Atención:</strong> El estado \'Baja lógica\' es irreversible e impedirá cualquier acceso futuro.';
                } else if (p && p.es_auxiliar_activo) {
                    warning.style.display = 'block';
                    warning.innerHTML = '<strong>Atención:</strong> Este colaborador es un Auxiliar con acceso activo. Desactivar su acceso revocará sus permisos de inmediato.';
                } else {
                    warning.style.display = 'none';
                }
            });
        }

        const aProceso = document.getElementById('a-proceso');
        if (aProceso) {
            aProceso.addEventListener('change', async (e) => {
                const procesoId = e.target.value;
                const machineSelect = document.getElementById('a-maquina');
                if (!machineSelect) return;
                machineSelect.innerHTML = '<option value="">Cualquier máquina</option>';

                if (procesoId) {
                    try {
                        const res = await fetch(`/api/maquinas?proceso_id=${procesoId}`);
                        const result = await res.json();
                        if (result.success) {
                            // Filtro de dominio: Bloquear máquinas en Baja o Fuera de Servicio para nuevas asignaciones
                            const allowedStates = ['Disponible', 'Operativa', 'En mantenimiento'];
                            const machines = result.data.filter(m => allowedStates.includes(m.estado_actual));

                            machineSelect.innerHTML += machines.map(m =>
                                `<option value="${m.id}">${m.nombre_visible} (${m.estado_actual})</option>`
                            ).join('');

                            if (machines.length === 0) {
                                DesignSystem.showToast('No hay máquinas operativas disponibles para este proceso', 'warning');
                            }
                        }
                    } catch (e) { console.error(e); }
                }
            });
        }
    },

    openModal(id = null) {
        this.currentStaffId = id;
        const form = document.getElementById('form-personal');
        form.reset();

        const editFields = document.getElementById('edit-audit-fields');
        const modalTitle = document.getElementById('modal-title');
        const codigoInput = document.getElementById('p-codigo');

        if (id) {
            const p = this.staff.find(x => x.id === id);
            modalTitle.textContent = 'Editar Personal';
            document.getElementById('p-nombre').value = p.nombre;
            document.getElementById('p-apellido').value = p.apellido;
            document.getElementById('p-codigo').value = p.codigo_interno;
            document.getElementById('p-email').value = p.email;
            document.getElementById('p-area').value = p.area_id;

            this.updateOrganizationalRoles(p.area_id);
            document.getElementById('p-rol-org').disabled = false;
            document.getElementById('p-rol-org').value = p.rol_organizacional;

            document.getElementById('p-fecha-ingreso').value = p.fecha_ingreso;
            document.getElementById('p-telefono').value = p.telefono || '';
            document.getElementById('p-estado').value = p.estado_laboral;
            document.getElementById('p-categoria').value = '';

            codigoInput.disabled = true;
            editFields.style.display = 'block';
        } else {
            modalTitle.textContent = 'Registrar Nuevo Personal';
            codigoInput.disabled = false;
            editFields.style.display = 'none';
            document.getElementById('p-rol-org').disabled = true;
        }

        document.getElementById('modal-personal').style.display = 'flex';
    },

    async saveStaff() {
        const id = this.currentStaffId;
        const data = {
            nombre: document.getElementById('p-nombre').value,
            apellido: document.getElementById('p-apellido').value,
            codigo_interno: document.getElementById('p-codigo').value,
            email: document.getElementById('p-email').value,
            area_id: parseInt(document.getElementById('p-area').value),
            rol_organizacional: document.getElementById('p-rol-org').value,
            fecha_ingreso: document.getElementById('p-fecha-ingreso').value,
            telefono: document.getElementById('p-telefono').value,
        };

        if (id) {
            const updateData = {
                email: data.email,
                telefono: data.telefono,
                rol_organizacional: document.getElementById('p-rol-org').value,
                estado_laboral: document.getElementById('p-estado').value,
                motivo_cambio: document.getElementById('p-motivo').value,
                categoria_motivo: document.getElementById('p-categoria').value
            };
            if (!updateData.categoria_motivo) {
                DesignSystem.showToast('La categoría de motivo es obligatoria', 'warning');
                return;
            }
            if (!updateData.motivo_cambio) {
                DesignSystem.showToast('El motivo del cambio es obligatorio para editar', 'warning');
                return;
            }
            try {
                const res = await fetch(`/api/personal/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
                const result = await res.json();
                if (result.success) {
                    DesignSystem.showToast('Personal actualizado con éxito');
                    closeModal();
                    this.loadStaff();
                } else {
                    DesignSystem.showToast(result.error, 'error');
                }
            } catch (e) { DesignSystem.showToast('Error de red', 'error'); }
        } else {
            try {
                const res = await fetch('/api/personal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.success) {
                    DesignSystem.showToast('Personal registrado con éxito. Psw temp: ' + result.data.tempPassword, 'info', 10000);
                    closeModal();
                    this.loadStaff();
                } else {
                    DesignSystem.showToast(result.error, 'error');
                }
            } catch (e) { DesignSystem.showToast('Error de red', 'error'); }
        }
    },

    async viewDetails(id) {
        this.currentStaffId = id;
        try {
            const res = await fetch(`/api/personal/${id}`);
            const result = await res.json();
            if (result.success) {
                const p = result.data;
                document.getElementById('detail-title').textContent = `Detalles: ${p.nombre} ${p.apellido}`;

                const isAuxActive = this.staff.find(s => s.id === id)?.es_auxiliar_activo;
                const indicator = document.getElementById('detail-indicator');
                if (isAuxActive) {
                    indicator.innerHTML = `
                        <div class="badge badge-primary w-100" style="padding: 10px; text-align: left; font-size: 0.9rem;">
                            <i data-lucide="shield-check" class="inline-icon"></i>
                            <strong>Atención:</strong> Colaborador identificado como Auxiliar con acceso activo al sistema.
                        </div>
                    `;
                } else {
                    indicator.innerHTML = '';
                }

                document.getElementById('staff-info-details').innerHTML = `
                    <div><strong>Código:</strong> ${p.codigo_interno}</div>
                    <div><strong>Email:</strong> ${p.email}</div>
                    <div><strong>Teléfono:</strong> ${p.telefono || '-'}</div>
                    <div><strong>Área:</strong> ${p.area_nombre}</div>
                    <div><strong>Rol Organizacional:</strong> ${p.rol_organizacional || '-'}</div>
                    <div><strong>Ingreso:</strong> ${p.fecha_ingreso}</div>
                    <div><strong>Estado Laboral:</strong> <span class="badge ${p.estado_laboral === 'Activo' ? 'badge-success' : 'badge-danger'}">${p.estado_laboral}</span></div>
                    <div><strong>Estado Usuario:</strong> <span class="badge ${p.estado_usuario === 'Activo' ? 'badge-success' : 'badge-warning'}">${p.estado_usuario || 'SIN USUARIO'}</span></div>
                `;

                document.getElementById('current-op-role').innerHTML = p.rol_operativo_actual
                    ? `<span class="badge badge-info" style="font-size: 1.1rem; padding: 8px 16px;">${p.rol_operativo_actual.rol_nombre}</span>`
                    : '<span class="text-secondary italic">Sin rol operativo asignado</span>';

                const assignmentsList = document.getElementById('active-assignments-details');
                if (p.asignaciones_activas && p.asignaciones_activas.length > 0) {
                    assignmentsList.innerHTML = p.asignaciones_activas.map(a => `
                        <div class="card p-2 mb-2" style="border-left: 4px solid var(--primary-base); background: rgba(0,0,0,0.02);">
                            <div style="font-weight: 600;">${a.proceso_nombre} ${a.maquina_codigo ? '- ' + a.maquina_codigo : ''}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">Turno: ${a.turno} ${a.permanente ? '(Permanente)' : ''}</div>
                        </div>
                    `).join('');
                } else {
                    assignmentsList.innerHTML = '<div class="text-secondary italic p-2">Sin asignaciones operativas activas</div>';
                }

                const groupList = document.getElementById('group-history-list');
                if (p.historial_grupos && p.historial_grupos.length > 0) {
                    groupList.innerHTML = p.historial_grupos.map(g => `
                        <tr>
                            <td><strong>${g.grupo_nombre}</strong></td>
                            <td>${new Date(g.fecha_desde).toLocaleDateString()}</td>
                            <td>${g.fecha_hasta ? new Date(g.fecha_hasta).toLocaleDateString() : '<span class="badge badge-success">Actual</span>'}</td>
                        </tr>
                    `).join('');
                } else {
                    groupList.innerHTML = '<tr><td colspan="3" class="text-center text-secondary italic">Sin historial de grupos</td></tr>';
                }

                document.getElementById('role-history-list').innerHTML = p.historial_roles.map(h => `
                    <tr>
                        <td>${h.rol_nombre}</td>
                        <td>${new Date(h.fecha_asignacion).toLocaleString()}</td>
                        <td>${h.asignado_por_nombre || 'Sistema'}</td>
                        <td><span class="badge ${h.activo ? 'badge-success' : 'badge-secondary'}">${h.activo ? 'Actual' : 'Anterior'}</span></td>
                    </tr>
                `).join('');

                DesignSystem.initLucide();
                document.getElementById('modal-detalle').style.display = 'flex';
            }
        } catch (e) {
            console.error(e);
            DesignSystem.showToast('Error al cargar detalles', 'error');
        }
    },

    openStatusModal(id, name, currentStatus) {
        this.currentStaffId = id;
        const p = this.staff.find(s => s.id === id);

        const btnConfirm = document.getElementById('btn-confirm-status');
        if (btnConfirm) DesignSystem.setBtnLoading(btnConfirm, false);

        document.getElementById('status-target-name').textContent = `Colaborador: ${name}`;
        document.getElementById('u-estado').value = currentStatus === 'S/U' ? 'Suspendido' : currentStatus;
        document.getElementById('u-motivo').value = '';

        const warning = document.getElementById('status-warning');
        if (p && p.es_auxiliar_activo) {
            warning.style.display = 'block';
            warning.innerHTML = '<strong>Atención:</strong> Este colaborador es un Auxiliar con acceso activo. Desactivar su acceso revocará sus permisos de inmediato.';
        } else {
            warning.style.display = 'none';
        }

        document.getElementById('modal-estado-usuario').style.display = 'flex';
    },

    closeStatusModal() {
        document.getElementById('modal-estado-usuario').style.display = 'none';
    },

    async saveStatusChange() {
        const id = this.currentStaffId;
        const estado_usuario = document.getElementById('u-estado').value;
        const motivo_cambio = document.getElementById('u-motivo').value;
        const categoria_motivo = document.getElementById('u-categoria').value;

        if (!categoria_motivo) {
            DesignSystem.showToast('Debe seleccionar una categoría de motivo', 'warning');
            return;
        }

        console.log('Saving status change:', { id, estado_usuario, motivo_cambio });

        if (!motivo_cambio || motivo_cambio.length < 5) {
            DesignSystem.showToast('Debe proporcionar un motivo descriptivo (mín. 5 caracteres)', 'warning');
            return;
        }

        try {
            DesignSystem.setBtnLoading(document.getElementById('btn-confirm-status'), true);
            console.log(`Calling PUT /api/personal/${id}/estado`);
            const res = await fetch(`/api/personal/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado_usuario, motivo_cambio, categoria_motivo })
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Estado de acceso actualizado correctamente');
                this.closeStatusModal();
                this.loadStaff();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        } finally {
            DesignSystem.setBtnLoading('btn-confirm-status', false);
        }
    },

    async saveAssignment() {
        const data = {
            proceso_id: parseInt(document.getElementById('a-proceso').value),
            maquina_id: document.getElementById('a-maquina').value ? parseInt(document.getElementById('a-maquina').value) : null,
            turno: document.getElementById('a-turno').value,
            permanente: document.getElementById('a-permanente').checked,
            motivo_cambio: document.getElementById('a-motivo').value
        };

        if (!data.proceso_id) {
            DesignSystem.showToast('Debe seleccionar un proceso', 'warning');
            return;
        }

        try {
            const res = await fetch(`/api/personal/${this.currentStaffId}/asignacion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Asignación registrada correctamente');
                document.getElementById('modal-asignacion').style.display = 'none';
                this.loadStaff();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) { DesignSystem.showToast('Error de red', 'error'); }
    }
};

function closeModal() {
    document.getElementById('modal-personal').style.display = 'none';
}

function closeDetailModal() {
    document.getElementById('modal-detalle').style.display = 'none';
}

window.PersonalModule = PersonalModule;
document.addEventListener('DOMContentLoaded', () => PersonalModule.init());
