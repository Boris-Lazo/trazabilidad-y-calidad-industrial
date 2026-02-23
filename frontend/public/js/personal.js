/**
 * GESTIÓN DE PERSONAL - PROD-SYS
 */

const PersonalModule = {
    staff: [],
    areas: [],
    roles: [],
    processes: [],
    machines: [],
    currentStaffId: null,

    async init() {
        await this.loadCatalogs();
        await this.loadStaff();
        this.setupEventListeners();
    },

    async loadCatalogs() {
        try {
            const res = await fetch('/api/personal/catalogos');
            const result = await res.json();
            if (result.success) {
                this.areas = result.data.areas;
                this.roles = result.data.roles;
                this.renderCatalogSelects();
            }

            const resProc = await fetch('/api/procesos-tipo');
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
        const areaSelects = [document.getElementById('p-area'), document.getElementById('filter-area')];
        const rolSelect = document.getElementById('p-rol');

        areaSelects.forEach(select => {
            if (select) {
                const currentVal = select.value;
                select.innerHTML = (select.id === 'filter-area' ? '<option value="">Todas</option>' : '') +
                    this.areas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('');
                select.value = currentVal;
            }
        });

        if (rolSelect) {
            rolSelect.innerHTML = this.roles.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
        }
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

        tbody.innerHTML = filtered.map(p => `
            <tr>
                <td><strong>${p.codigo_interno}</strong></td>
                <td>${p.nombre} ${p.apellido}</td>
                <td>${p.area_nombre}</td>
                <td><span class="badge badge-info">${p.rol_actual || 'Sin Rol'}</span></td>
                <td>
                    <span class="badge ${p.estado_laboral === 'activo' ? 'badge-success' : 'badge-danger'}">
                        ${p.estado_laboral.toUpperCase()}
                    </span>
                </td>
                <td>
                    <span class="badge ${p.estado_usuario === 'activo' ? 'badge-success' : 'badge-warning'}">
                        ${(p.estado_usuario || 'S/U').toUpperCase()}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm" onclick="PersonalModule.editStaff(${p.id})" title="Editar">
                            <i data-lucide="edit-2" style="width:14px; height:14px;"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="PersonalModule.viewDetails(${p.id})" title="Ver Detalles / Asignaciones">
                            <i data-lucide="eye" style="width:14px; height:14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        DesignSystem.initLucide();
    },

    setupEventListeners() {
        document.getElementById('btn-nuevo-personal').addEventListener('click', () => this.openModal());
        document.getElementById('search-staff').addEventListener('input', () => this.renderStaffList());
        document.getElementById('filter-area').addEventListener('change', () => this.renderStaffList());
        document.getElementById('btn-save-personal').addEventListener('click', () => this.saveStaff());
        document.getElementById('btn-save-assignment').addEventListener('click', () => this.saveAssignment());

        document.getElementById('a-proceso').addEventListener('change', async (e) => {
            const procesoId = e.target.value;
            const machineSelect = document.getElementById('a-maquina');
            machineSelect.innerHTML = '<option value="">Cualquier máquina</option>';

            if (procesoId) {
                try {
                    const res = await fetch(`/api/telares/maquinas?proceso_id=${procesoId}`);
                    const result = await res.json();
                    if (result.success) {
                        machineSelect.innerHTML += result.data.map(m => `<option value="${m.id}">${m.codigo}</option>`).join('');
                    }
                } catch (e) { console.error(e); }
            }
        });
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
            document.getElementById('p-tipo').value = p.tipo_personal;
            document.getElementById('p-fecha-ingreso').value = p.fecha_ingreso;
            document.getElementById('p-telefono').value = p.telefono || '';
            document.getElementById('p-estado').value = p.estado_laboral;

            codigoInput.disabled = true;
            editFields.style.display = 'block';
            document.getElementById('p-rol').closest('.form-group').style.display = 'none';
        } else {
            modalTitle.textContent = 'Registrar Nuevo Personal';
            codigoInput.disabled = false;
            editFields.style.display = 'none';
            document.getElementById('p-rol').closest('.form-group').style.display = 'block';
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
            rol_id: parseInt(document.getElementById('p-rol').value),
            tipo_personal: document.getElementById('p-tipo').value,
            fecha_ingreso: document.getElementById('p-fecha-ingreso').value,
            telefono: document.getElementById('p-telefono').value,
        };

        if (id) {
            const updateData = {
                email: data.email,
                telefono: data.telefono,
                estado_laboral: document.getElementById('p-estado').value,
                motivo_cambio: document.getElementById('p-motivo').value
            };
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

                document.getElementById('staff-info').innerHTML = `
                    <div class="metadata-grid">
                        <div><strong>Código:</strong> ${p.codigo_interno}</div>
                        <div><strong>Usuario:</strong> ${p.username || '-'}</div>
                        <div><strong>Área:</strong> ${p.area_nombre}</div>
                        <div><strong>Email:</strong> ${p.email}</div>
                        <div><strong>Teléfono:</strong> ${p.telefono || '-'}</div>
                        <div><strong>Tipo:</strong> ${p.tipo_personal}</div>
                        <div><strong>Ingreso:</strong> ${p.fecha_ingreso}</div>
                        <div><strong>Estado:</strong> ${p.estado_laboral}</div>
                    </div>
                `;

                const assignmentsList = document.getElementById('active-assignments');
                if (p.asignaciones_activas && p.asignaciones_activas.length > 0) {
                    assignmentsList.innerHTML = p.asignaciones_activas.map(a => `
                        <div class="card p-2 mb-2" style="border-left: 4px solid var(--primary-base);">
                            <div style="font-weight: 600;">${a.proceso_nombre} ${a.maquina_codigo ? '- ' + a.maquina_codigo : ''}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">Turno: ${a.turno} ${a.permanente ? '(Permanente)' : ''}</div>
                        </div>
                    `).join('');
                } else {
                    assignmentsList.innerHTML = '<div class="text-secondary italic">Sin asignaciones activas</div>';
                }

                document.getElementById('role-history-list').innerHTML = p.historial_roles.map(h => `
                    <tr>
                        <td>${h.rol_nombre}</td>
                        <td>${new Date(h.fecha_asignacion).toLocaleString()}</td>
                        <td>${h.asignado_por_nombre || 'Sistema'}</td>
                        <td><span class="badge ${h.activo ? 'badge-success' : 'badge-secondary'}">${h.activo ? 'Actual' : 'Anterior'}</span></td>
                    </tr>
                `).join('');

                document.getElementById('modal-detalle').style.display = 'flex';
            }
        } catch (e) { DesignSystem.showToast('Error al cargar detalles', 'error'); }
    },

    async saveAssignment() {
        const data = {
            proceso_tipo_id: parseInt(document.getElementById('a-proceso').value),
            maquina_id: document.getElementById('a-maquina').value ? parseInt(document.getElementById('a-maquina').value) : null,
            turno: document.getElementById('a-turno').value,
            permanente: document.getElementById('a-permanente').checked
        };

        if (!data.proceso_tipo_id) {
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
                this.viewDetails(this.currentStaffId);
                document.getElementById('form-asignacion').reset();
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
