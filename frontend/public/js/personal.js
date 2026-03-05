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
            return matchesSearch && matchesArea && matchesRol && matchesEstadoLaboral;
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

            let badgeClass = 'badge-secondary';
            if (p.estado_efectivo === 'Activo') badgeClass = 'badge-success';
            if (p.estado_laboral === 'Baja') badgeClass = 'badge-danger';
            if (p.estado_laboral === 'Incapacitado') badgeClass = 'badge-warning';

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
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span class="badge ${badgeClass}">
                            ${p.estado_laboral.toUpperCase()}
                        </span>
                        ${p.ausencia_vencida ? '<span class="badge badge-error" style="font-size:10px;">VENCIDA</span>' : ''}
                    </div>
                </td>
                <td>
                    ${p.username ? `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="btn ${p.estado_usuario === 'Activo' ? 'btn-success' : 'btn-warning'} btn-sm btn-toggle-acceso"
                                style="font-size: 10px; padding: 2px 8px; min-height: auto;"
                                ${!canManage || p.estado_laboral === 'Baja' ? 'disabled' : ''}>
                            ${p.estado_usuario === 'Activo' ? 'ACTIVO' : 'INACTIVO'}
                        </button>
                        ${canManage && p.estado_laboral !== 'Baja' ? `
                        <button class="btn btn-secondary btn-sm btn-reset-psw" title="Reiniciar Contraseña">
                            <i data-lucide="key" style="width:14px; height:14px;"></i>
                        </button>` : ''}
                    </div>` : '<span class="text-secondary" style="font-size:12px;">Sin Acceso</span>'}
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
            const staffMember = this.staff.find(p => p.id === staffId);

            const resetBtn = row.querySelector('.btn-reset-psw');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.openResetModal(staffId, `${staffMember.nombre} ${staffMember.apellido}`);
                });
            }

            const editBtn = row.querySelector('.btn-edit');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.openAusenciaModal(staffId);
                });
            }

            const toggleAccesoBtn = row.querySelector('.btn-toggle-acceso');
            if (toggleAccesoBtn) {
                toggleAccesoBtn.addEventListener('click', () => {
                    this.toggleAcceso(staffId, staffMember);
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
        document.getElementById('btn-save-personal').addEventListener('click', () => this.saveStaff());
        document.getElementById('btn-save-ausencia').addEventListener('click', () => this.saveAusencia());
        document.getElementById('btn-cancel-ausencia').addEventListener('click', () => this.closeAusenciaModal());
        document.getElementById('btn-close-ausencia').addEventListener('click', () => this.closeAusenciaModal());
        document.getElementById('aus-estado').addEventListener('change', (e) => this._toggleAusenciaCampos(e.target.value));

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

        document.getElementById('btn-confirm-reset').addEventListener('click', () => this.executePasswordReset());

        const pEstado = document.getElementById('p-estado');
        if (pEstado) {
            pEstado.addEventListener('change', (e) => {
                const absenceFields = document.getElementById('absence-fields');
                const val = e.target.value;
                if (['Incapacitado', 'Inactivo', 'Baja'].includes(val)) {
                    absenceFields.style.display = 'block';
                    document.getElementById('p-abs-tipo').value = val === 'Incapacitado' ? 'Incapacidad' : (val === 'Inactivo' ? 'Permiso' : '');

                    // Ajustar obligatoriedad de campos visualmente
                    document.getElementById('p-abs-hasta').disabled = (val === 'Baja');
                } else {
                    absenceFields.style.display = 'none';
                }
            });
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
        document.getElementById('btn-close-reset').addEventListener('click', () => this.closeResetModal());
        document.getElementById('btn-cancel-reset').addEventListener('click', () => this.closeResetModal());
        document.getElementById('btn-close-detail').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('btn-cancel-detail').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('btn-close-assignment').addEventListener('click', () => this.closeAssignmentModal());
        document.getElementById('btn-cancel-assignment').addEventListener('click', () => this.closeAssignmentModal());
    },

    openModal() {
        this.currentStaffId = null;
        const form = document.getElementById('form-personal');
        if (form) form.reset();

        const editFields = document.getElementById('edit-audit-fields');
        const modalTitle = document.getElementById('modal-title');
        const codigoInput = document.getElementById('p-codigo');
        const rolSelect = document.getElementById('p-rol-org');

        if (modalTitle) modalTitle.textContent = 'Registrar Nuevo Colaborador';
        if (codigoInput) codigoInput.disabled = false;
        if (editFields) editFields.style.display = 'none';
        if (rolSelect) rolSelect.disabled = true;

        document.getElementById('modal-personal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('modal-personal').style.display = 'none';
    },

    async saveStaff() {
        const data = {
            nombre: document.getElementById('p-nombre').value,
            apellido: document.getElementById('p-apellido').value,
            codigo_interno: document.getElementById('p-codigo').value,
            area_id: parseInt(document.getElementById('p-area').value),
            rol_organizacional: document.getElementById('p-rol-org').value
        };

        try {
            const res = await fetch('/api/personal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Colaborador registrado con éxito. Psw temp: ' + result.data.tempPassword, 'info', 10000);
                this.closeModal();
                this.loadStaff();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
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

                const ausenciasList = document.getElementById('ausencias-history-list');
                if (p.historial_ausencias && p.historial_ausencias.length > 0) {
                    ausenciasList.innerHTML = p.historial_ausencias.map(a => `
                        <tr>
                            <td>
                                <span class="badge ${
                                    a.estado_laboral === 'Incapacitado' ? 'badge-warning' :
                                    a.estado_laboral === 'Baja' ? 'badge-danger' : 'badge-secondary'
                                }">
                                    ${a.tipo_ausencia || a.estado_laboral}
                                </span>
                            </td>
                            <td>${this.formatDate(a.ausencia_desde)}</td>
                            <td>${a.ausencia_hasta ? this.formatDate(a.ausencia_hasta) : '—'}</td>
                            <td style="font-size:12px;">${a.motivo_ausencia || '—'}</td>
                        </tr>
                    `).join('');
                } else {
                    ausenciasList.innerHTML = '<tr><td colspan="4" class="text-center text-secondary italic">Sin ausencias registradas</td></tr>';
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

    openResetModal(id, name) {
        this.currentStaffId = id;
        document.getElementById('reset-target-name').textContent = `Colaborador: ${name}`;
        document.getElementById('reset-result').style.display = 'none';
        document.getElementById('btn-confirm-reset').style.display = 'block';
        document.getElementById('modal-reset-password').style.display = 'flex';
    },

    closeResetModal() {
        document.getElementById('modal-reset-password').style.display = 'none';
    },

    async executePasswordReset() {
        const id = this.currentStaffId;
        try {
            DesignSystem.setBtnLoading(document.getElementById('btn-confirm-reset'), true);
            const res = await fetch(`/api/personal/${id}/reset-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            if (result.success) {
                document.getElementById('temp-password-display').textContent = result.data.tempPassword;
                document.getElementById('reset-result').style.display = 'block';
                document.getElementById('btn-confirm-reset').style.display = 'none';
                DesignSystem.showToast('Contraseña reiniciada con éxito');
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

    _renderEstadoBadge(p) {
        let badgeClass = 'badge-secondary';
        if (p.estado_efectivo === 'Activo') badgeClass = 'badge-success';
        if (p.estado_laboral === 'Baja') badgeClass = 'badge-danger';
        if (p.estado_laboral === 'Incapacitado') badgeClass = 'badge-warning';
        return `<span class="badge ${badgeClass}">${p.estado_laboral.toUpperCase()}</span>`;
    },

    closeAssignmentModal() {
        document.getElementById('modal-asignacion').style.display = 'none';
    },

    openAusenciaModal(id) {
        this.currentStaffId = id;
        const p = this.staff.find(s => s.id === id);

        document.getElementById('ausencia-modal-title').textContent = `Reportar Ausencia — ${p.nombre} ${p.apellido}`;
        document.getElementById('ausencia-nombre-colaborador').textContent = `${p.nombre} ${p.apellido}`;

        const estadoActualBadge = this._renderEstadoBadge(p);
        document.getElementById('ausencia-estado-actual').innerHTML = estadoActualBadge;

        document.getElementById('aus-estado').value = p.estado_laboral;
        document.getElementById('aus-desde').value = p.ausencia_desde || '';
        document.getElementById('aus-hasta').value = p.ausencia_hasta || '';
        document.getElementById('aus-motivo').value = p.motivo_ausencia || '';

        this._toggleAusenciaCampos(p.estado_laboral);

        document.getElementById('modal-ausencia').style.display = 'flex';
    },

    _toggleAusenciaCampos(estado) {
        const campos = document.getElementById('aus-campos-ausencia');
        const warning = document.getElementById('aus-baja-warning');
        const hasta = document.getElementById('aus-hasta');

        if (estado === 'Activo') {
            campos.style.display = 'none';
            warning.style.display = 'none';
        } else {
            campos.style.display = 'block';
            warning.style.display = estado === 'Baja' ? 'block' : 'none';
            hasta.disabled = estado === 'Baja';
            if (estado === 'Baja') hasta.value = '';
        }
    },

    async saveAusencia() {
        const id = this.currentStaffId;
        const estadoNuevo = document.getElementById('aus-estado').value;
        const desde = document.getElementById('aus-desde').value;
        const hasta = document.getElementById('aus-hasta').value;
        const motivo = document.getElementById('aus-motivo').value;

        const data = {
            estado_laboral: estadoNuevo,
            ausencia_desde: desde || null,
            ausencia_hasta: hasta || null,
            tipo_ausencia: estadoNuevo === 'Incapacitado' ? 'Incapacidad' : (estadoNuevo === 'Inactivo' ? 'Permiso' : null),
            motivo_ausencia: motivo || null,
            motivo_cambio: motivo || 'Actualización de estado laboral',
            categoria_motivo: 'AJUSTE_OPERATIVO'
        };

        // Validaciones
        if (estadoNuevo !== 'Activo') {
            if (!desde) {
                DesignSystem.showToast('La fecha de inicio es obligatoria', 'warning');
                return;
            }
            if (['Incapacitado', 'Inactivo'].includes(estadoNuevo) && !hasta) {
                DesignSystem.showToast('La fecha de fin es obligatoria', 'warning');
                return;
            }
            if (!motivo || motivo.length < 5) {
                DesignSystem.showToast('El motivo es obligatorio (mín. 5 caracteres)', 'warning');
                return;
            }
        } else {
            data.ausencia_desde = null;
            data.ausencia_hasta = null;
            data.tipo_ausencia = null;
            data.motivo_ausencia = null;
        }

        try {
            const res = await fetch(`/api/personal/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Estado actualizado correctamente');
                this.closeAusenciaModal();
                this.loadStaff();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        }
    },

    closeAusenciaModal() {
        document.getElementById('modal-ausencia').style.display = 'none';
    },

    async toggleAcceso(id, persona) {
        try {
            const res = await fetch(`/api/personal/${id}/acceso`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acceso_activo: persona.estado_usuario !== 'Activo' })
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Acceso actualizado correctamente');
                this.loadStaff();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
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