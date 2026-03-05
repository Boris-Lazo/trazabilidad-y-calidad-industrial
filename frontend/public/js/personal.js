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
    sortState: { key: 'codigo', order: 'asc' },

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
                this.roles = [...new Set(Object.values(this.mappingAreaRoles).flat())];
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
        const filterRolSelect = document.getElementById('filter-rol');

        if (areaSelect) {
            areaSelect.innerHTML = '<option value="">Seleccione área...</option>' +
                this.areas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
        }

        if (filterAreaSelect) {
            filterAreaSelect.innerHTML = '<option value="">Todas</option>' +
                this.areas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
        }
        
        if (filterRolSelect) {
            filterRolSelect.innerHTML = '<option value="">Todos</option>' +
                this.roles.map(r => `<option value="${r}">${r}</option>`).join('');
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
        const rolFilter = document.getElementById('filter-rol').value;
        const estadoLaboralFilter = document.getElementById('filter-estado-laboral').value;
        const estadoUsuarioFilter = document.getElementById('filter-estado-usuario').value;
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

        let filtered = this.staff.filter(p => {
            const matchesSearch = p.nombre.toLowerCase().includes(searchTerm) ||
                                 p.apellido.toLowerCase().includes(searchTerm) ||
                                 p.codigo_interno.toLowerCase().includes(searchTerm);
            const matchesArea = !areaFilter || p.area_id == areaFilter;
            const matchesRol = !rolFilter || p.rol_organizacional === rolFilter;
            const matchesEstadoLaboral = !estadoLaboralFilter || p.estado_laboral === estadoLaboralFilter;
            const matchesEstadoUsuario = !estadoUsuarioFilter || p.estado_usuario === estadoUsuarioFilter;
            return matchesSearch && matchesArea && matchesRol && matchesEstadoLaboral && matchesEstadoUsuario;
        });

        // Sorting logic
        filtered.sort((a, b) => {
            let valA, valB;
            if (this.sortState.key === 'codigo') {
                valA = a.codigo_interno;
                valB = b.codigo_interno;
            } else if (this.sortState.key === 'nombre') {
                valA = `${a.nombre} ${a.apellido}`.toLowerCase();
                valB = `${b.nombre} ${b.apellido}`.toLowerCase();
            } else {
                valA = a[this.sortState.key];
                valB = b[this.sortState.key];
            }

            if (valA < valB) return this.sortState.order === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortState.order === 'asc' ? 1 : -1;
            return 0;
        });


        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-secondary">No se encontró personal</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const isAuxActive = p.es_auxiliar_activo;
            const rowStyle = isAuxActive ? 'background-color: rgba(30, 64, 175, 0.05); border-left: 4px solid var(--primary-base);' : '';

            return `
            <tr style="${rowStyle}" data-staff-id="${p.id}">
                <td>
                    <strong>${p.codigo_interno}</strong>
                    ${isAuxActive ? '<br><small class="text-primary" style="font-weight:600;">Auxiliar con Acceso</small>' : ''}
                </td>
                <td>${p.nombre} ${p.apellido}</td>
                <td>${p.area_nombre}</td>
                <td><span class="badge badge-info">${p.rol_organizacional || 'Sin Rol'}</span></td>
                <td>
                    ${this._renderEstadoBadge(p)}
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        ${canManage && p.estado_laboral !== 'Baja' ? `
                        <button class="btn btn-secondary btn-sm btn-edit" title="Editar">
                            <i data-lucide="pencil" style="width:14px; height:14px;"></i>
                        </button>` : ''}
                        <button class="btn btn-secondary btn-sm btn-view" title="Ver Detalle">
                            <i data-lucide="eye" style="width:14px; height:14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
        DesignSystem.initLucide();
        this.setupRowEventListeners();
    },

    setupRowEventListeners() {
        document.querySelectorAll('#lista-personal tr[data-staff-id]').forEach(row => {
            const staffId = parseInt(row.dataset.staffId);

            const editBtn = row.querySelector('.btn-edit');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.openModal(staffId);
                });
            }

            const viewBtn = row.querySelector('.btn-view');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    this.viewDetails(staffId);
                });
            }
        });
    },

    setupEventListeners() {
        const btnNuevo = document.getElementById('btn-nuevo-personal');
        if (btnNuevo) btnNuevo.addEventListener('click', () => this.openModal());

        document.getElementById('search-staff').addEventListener('input', () => this.renderStaffList());
        document.getElementById('filter-area').addEventListener('change', () => this.renderStaffList());
        document.getElementById('filter-rol').addEventListener('change', () => this.renderStaffList());
        document.getElementById('filter-estado-laboral').addEventListener('change', () => this.renderStaffList());
        document.getElementById('filter-estado-usuario').addEventListener('change', () => this.renderStaffList());
        document.getElementById('btn-save-personal').addEventListener('click', () => this.saveStaff());

        document.querySelectorAll('#tabla-personal .sortable').forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sortKey;
                if (this.sortState.key === sortKey) {
                    this.sortState.order = this.sortState.order === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortState.key = sortKey;
                    this.sortState.order = 'asc';
                }
                this.renderStaffList();
            });
        });


        const pArea = document.getElementById('p-area');
        if (pArea) {
            pArea.addEventListener('change', (e) => this.updateOrganizationalRoles(e.target.value));
        }

        const btnSaveAsig = document.getElementById('btn-save-assignment');
        if (btnSaveAsig) btnSaveAsig.addEventListener('click', () => this.saveAssignment());

        document.getElementById('p-estado').addEventListener('change', (e) => this._toggleAusenciaFields(e.target.value));

        const btnResetDetalle = document.getElementById('btn-reset-desde-detalle');
        if (btnResetDetalle) {
            btnResetDetalle.addEventListener('click', () => this.openResetModal(this.currentStaffId));
        }

        document.getElementById('btn-confirm-reset').addEventListener('click', () => this.confirmReset());

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

        // Event listeners for modal close buttons
        document.getElementById('btn-close-personal').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-personal').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-close-detail').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('btn-cancel-detail').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('btn-close-assignment').addEventListener('click', () => this.closeAssignmentModal());
        document.getElementById('btn-cancel-assignment').addEventListener('click', () => this.closeAssignmentModal());
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
            this._toggleAusenciaFields(p.estado_laboral);

            if (p.ausencia_desde) {
                document.getElementById('p-ausencia-desde').value = p.ausencia_desde || '';
                document.getElementById('p-ausencia-hasta').value = p.ausencia_hasta || '';
                document.getElementById('p-tipo-ausencia').value = p.tipo_ausencia || 'Incapacidad';
                document.getElementById('p-ausencia-desde-baja').value = p.ausencia_desde || '';
            }

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

    closeModal() {
        document.getElementById('modal-personal').style.display = 'none';
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
            const estadoNuevo = document.getElementById('p-estado').value;
            const updateData = {
                email: data.email,
                telefono: data.telefono,
                rol_organizacional: document.getElementById('p-rol-org').value,
                estado_laboral: estadoNuevo,
                motivo_cambio: document.getElementById('p-motivo').value,
                categoria_motivo: document.getElementById('p-categoria').value
            };

            if (['Incapacitado', 'Inactivo'].includes(estadoNuevo)) {
                updateData.ausencia_desde = document.getElementById('p-ausencia-desde').value;
                updateData.ausencia_hasta = document.getElementById('p-ausencia-hasta').value;
                updateData.tipo_ausencia = document.getElementById('p-tipo-ausencia').value;
                updateData.motivo_ausencia = document.getElementById('p-motivo').value;

                if (!updateData.ausencia_desde || !updateData.ausencia_hasta) {
                    DesignSystem.showToast('Las fechas de ausencia son obligatorias', 'warning');
                    return;
                }
            } else if (estadoNuevo === 'Baja') {
                updateData.ausencia_desde = document.getElementById('p-ausencia-desde-baja').value;
                updateData.motivo_ausencia = document.getElementById('p-motivo').value;

                if (!updateData.ausencia_desde) {
                    DesignSystem.showToast('La fecha de salida es obligatoria', 'warning');
                    return;
                }
            } else {
                // Activo — limpiar campos de ausencia
                updateData.ausencia_desde = null;
                updateData.ausencia_hasta = null;
                updateData.tipo_ausencia = null;
                updateData.motivo_ausencia = null;
            }

            if (!updateData.motivo_ausencia) {
                updateData.motivo_ausencia = document.getElementById('p-motivo').value;
            }

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
                    this.closeModal();
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
                    this.closeModal();
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

                const estadoBadge = this._renderEstadoBadge(p);
                let ausenciaInfo = '';
                if (['Incapacitado', 'Inactivo'].includes(p.estado_laboral)) {
                    ausenciaInfo = `
                        <div><strong>Tipo:</strong> ${p.tipo_ausencia || '-'}</div>
                        <div><strong>Desde:</strong> ${this.formatDate(p.ausencia_desde)}</div>
                        <div><strong>Hasta:</strong> ${this.formatDate(p.ausencia_hasta)}</div>
                        <div><strong>Motivo:</strong> ${p.motivo_ausencia || '-'}</div>
                        ${p.ausencia_vencida ? '<div class="badge badge-warning" style="white-space:normal;">⚠ Ausencia vencida — pendiente de confirmar retorno</div>' : ''}
                    `;
                } else if (p.estado_laboral === 'Baja') {
                    ausenciaInfo = `
                        <div><strong>Fecha de salida:</strong> ${this.formatDate(p.ausencia_desde)}</div>
                        <div><strong>Motivo:</strong> ${p.motivo_ausencia || '-'}</div>
                    `;
                }

                document.getElementById('staff-info-details').innerHTML = `
                    <div><strong>Código:</strong> ${p.codigo_interno}</div>
                    <div><strong>Email:</strong> ${p.email}</div>
                    <div><strong>Teléfono:</strong> ${p.telefono || '-'}</div>
                    <div><strong>Área:</strong> ${p.area_nombre}</div>
                    <div><strong>Rol Organizacional:</strong> ${p.rol_organizacional || '-'}</div>
                    <div><strong>Ingreso:</strong> ${p.fecha_ingreso}</div>
                    <div><strong>Estado:</strong> ${estadoBadge}</div>
                    ${ausenciaInfo}
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

                const btnReset = document.getElementById('btn-reset-desde-detalle');
                if (btnReset) {
                    const user = Auth.getUser();
                    const esAdmin = user && (user.rol === 'Administrador' || user.rol === 'Jefe de Operaciones');
                    btnReset.style.display = esAdmin && p.estado_laboral !== 'Baja' ? 'inline-flex' : 'none';
                }

                DesignSystem.initLucide();
                document.getElementById('modal-detalle').style.display = 'flex';
            }
        } catch (e) {
            console.error(e);
            DesignSystem.showToast('Error al cargar detalles', 'error');
        }
    },

    closeDetailModal() {
        document.getElementById('modal-detalle').style.display = 'none';
    },

    _renderEstadoBadge(p) {
        const estado = p.estado_laboral;
        if (estado === 'Activo') {
            return `<span class="badge badge-success">ACTIVO</span>`;
        }

        if (estado === 'Incapacitado') {
            if (p.ausencia_vencida === true) {
                return `
                    <span class="badge badge-warning">INCAPACITADO</span>
                    <br>
                    <small style="color:var(--warning);">⚠ Vencida el ${this.formatDate(p.ausencia_hasta)}</small>
                `;
            } else {
                return `
                    <span class="badge badge-warning">INCAPACITADO</span>
                    <br>
                    <small class="text-secondary">Hasta ${this.formatDate(p.ausencia_hasta)}</small>
                `;
            }
        }

        if (estado === 'Inactivo') {
            if (p.ausencia_vencida === true) {
                return `
                    <span class="badge badge-secondary">INACTIVO</span>
                    <br>
                    <small style="color:var(--warning);">⚠ Vencida el ${this.formatDate(p.ausencia_hasta)}</small>
                `;
            } else {
                return `
                    <span class="badge badge-secondary">INACTIVO</span>
                    <br>
                    <small class="text-secondary">Hasta ${this.formatDate(p.ausencia_hasta)}</small>
                `;
            }
        }

        if (estado === 'Baja') {
            return `
                <span class="badge badge-danger">BAJA</span>
                <br>
                <small class="text-secondary">Desde ${this.formatDate(p.ausencia_desde)}</small>
            `;
        }
        return `<span class="badge badge-secondary">${estado ? estado.toUpperCase() : '-'}</span>`;
    },

    _toggleAusenciaFields(estado) {
        const bloqueAusencia = document.getElementById('bloque-ausencia');
        const bloqueBaja = document.getElementById('bloque-baja');
        const bajaWarning = document.getElementById('baja-warning');

        if (bloqueAusencia) bloqueAusencia.style.display = ['Incapacitado', 'Inactivo'].includes(estado) ? 'block' : 'none';
        if (bloqueBaja) bloqueBaja.style.display = estado === 'Baja' ? 'block' : 'none';
        if (bajaWarning) bajaWarning.style.display = estado === 'Baja' ? 'block' : 'none';

        // Ajustar tipo_ausencia según estado
        const tipoSelect = document.getElementById('p-tipo-ausencia');
        if (tipoSelect) {
            if (estado === 'Incapacitado') tipoSelect.value = 'Incapacidad';
            else if (estado === 'Inactivo') tipoSelect.value = 'Permiso';
        }
    },

    openResetModal(id) {
        this.currentStaffId = id;
        const p = this.staff.find(s => s.id === id);
        document.getElementById('reset-target-name').textContent = p ? `Colaborador: ${p.nombre} ${p.apellido}` : '';
        document.getElementById('reset-result').style.display = 'none';
        document.getElementById('reset-modal-footer').style.display = 'flex';
        document.getElementById('modal-reset-password').style.display = 'flex';
    },

    closeResetModal() {
        document.getElementById('modal-reset-password').style.display = 'none';
    },

    async confirmReset() {
        try {
            DesignSystem.setBtnLoading(document.getElementById('btn-confirm-reset'), true);
            const res = await fetch(`/api/personal/${this.currentStaffId}/reset-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            if (result.success) {
                document.getElementById('reset-temp-password').textContent = result.data.tempPassword;
                document.getElementById('reset-result').style.display = 'block';
                document.getElementById('reset-modal-footer').style.display = 'none';
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        } finally {
            DesignSystem.setBtnLoading(document.getElementById('btn-confirm-reset'), false);
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    },

    closeAssignmentModal() {
        document.getElementById('modal-asignacion').style.display = 'none';
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
                this.closeAssignmentModal();
                this.loadStaff();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) { DesignSystem.showToast('Error de red', 'error'); }
    }
};

window.PersonalModule = PersonalModule;
document.addEventListener('DOMContentLoaded', () => PersonalModule.init());