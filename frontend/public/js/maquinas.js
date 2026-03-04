/**
 * GESTIÓN DE MÁQUINAS - PROD-SYS
 */

const MaquinaModule = {
    machines: [],
    processes: [],
    currentMachineId: null,

    async init() {
        await this.loadCatalogs();
        await this.loadMachines();
        this.setupEventListeners();
    },

    async loadCatalogs() {
        try {
            const res = await fetch('/api/procesos');
            const result = await res.json();
            if (result.success) {
                this.processes = result.data;
                const select = document.getElementById('filter-proceso');
                if (select) {
                    select.innerHTML = '<option value="">Todos</option>' +
                        this.processes.map(p => `<option value="${p.processId}">${p.nombre}</option>`).join('');
                }
            }
        } catch (error) {
            console.error('Error al cargar procesos:', error);
        }
    },

    async loadMachines() {
        try {
            const res = await fetch('/api/maquinas');
            const result = await res.json();
            if (result.success) {
                this.machines = result.data;
                this.renderMachines();
            }
        } catch (error) {
            DesignSystem.showToast('Error al cargar máquinas', 'error');
        }
    },

    renderMachines() {
        const tbody = document.getElementById('lista-maquinas');
        const searchTerm = document.getElementById('search-machine').value.toLowerCase();
        const procesoFilter = document.getElementById('filter-proceso').value;
        const estadoFilter = document.getElementById('filter-estado').value;
        const user = Auth.getUser();

        // Reglas de permisos: Solo Administrador, Jefe de Operaciones e Inspector pueden cambiar estado
        // (Basado en ROLE_PERMISSIONS en backend/shared/auth/permissions.js)
        const canManage = user && (user.rol === 'Administrador' || user.rol === 'Jefe de Operaciones' || user.rol === 'Inspector');

        const filtered = this.machines.filter(m => {
            const matchesSearch = m.nombre_visible.toLowerCase().includes(searchTerm);
            const matchesProceso = !procesoFilter || m.proceso_id == procesoFilter;
            const matchesEstado = !estadoFilter || m.estado_actual === estadoFilter;
            return matchesSearch && matchesProceso && matchesEstado;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-secondary">No se encontraron máquinas</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(m => {
            const proceso = this.processes.find(p => p.processId == m.proceso_id);
            const statusClass = this.getStatusClass(m.estado_actual);

            return `
                <tr>
                    <td><strong>${m.nombre_visible}</strong></td>
                    <td>${proceso ? proceso.nombre : 'ID: ' + m.proceso_id}</td>
                    <td><span class="badge ${statusClass}">${m.estado_actual.toUpperCase()}</span></td>
                    <td>
                        <span class="badge ${m.ordenes_activas > 0 ? 'badge-warning' : 'badge-secondary'}">
                            ${m.ordenes_activas} activas
                        </span>
                    </td>
                    <td>${new Date(m.updated_at).toLocaleString()}</td>
                    <td>
                        <div class="d-flex gap-1">
                            ${canManage && m.estado_actual !== 'Baja' ? `
                            <button class="btn btn-secondary btn-sm" onclick="MaquinaModule.openModal(${m.id})" title="Cambiar Estado">
                                <i data-lucide="settings-2" class="icon-xs"></i>
                            </button>` : ''}
                            <button class="btn btn-secondary btn-sm" onclick="MaquinaModule.viewHistory(${m.id})" title="Ver Historial">
                                <i data-lucide="history" class="icon-xs"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        DesignSystem.initLucide();
    },

    getStatusClass(estado) {
        switch (estado) {
            case 'Operativa': return 'badge-success';
            case 'Disponible': return 'badge-info';
            case 'En mantenimiento': return 'badge-warning';
            case 'Fuera de servicio': return 'badge-danger';
            case 'Baja': return 'badge-secondary';
            default: return 'badge-secondary';
        }
    },

    setupEventListeners() {
        document.getElementById('search-machine').addEventListener('input', () => this.renderMachines());
        document.getElementById('filter-proceso').addEventListener('change', () => this.renderMachines());
        document.getElementById('filter-estado').addEventListener('change', () => this.renderMachines());
        document.getElementById('btn-confirm-estado').addEventListener('click', () => this.saveStatusChange());
    },

    openModal(id) {
        this.currentMachineId = id;
        const machine = this.machines.find(m => m.id === id);

        document.getElementById('machine-target-name').textContent = `Máquina: ${machine.nombre_visible}`;
        document.getElementById('m-estado').value = machine.estado_actual;
        document.getElementById('m-motivo').value = '';
        document.getElementById('m-categoria').value = '';

        const warning = document.getElementById('active-orders-warning');
        if (machine.ordenes_activas > 0) {
            warning.classList.add('block');
        } else {
            warning.classList.remove('block');
        }

        document.getElementById('modal-estado-maquina').classList.add('d-flex');
    },

    closeModal() {
        document.getElementById('modal-estado-maquina').classList.remove('d-flex');
    },

    async saveStatusChange() {
        const id = this.currentMachineId;
        const nuevoEstado = document.getElementById('m-estado').value;
        const motivo = document.getElementById('m-motivo').value;
        const categoria = document.getElementById('m-categoria').value;

        if (!categoria) {
            DesignSystem.showToast('Debe seleccionar una categoría de motivo', 'warning');
            return;
        }

        if (!motivo || motivo.length < 5) {
            DesignSystem.showToast('Debe proporcionar un motivo descriptivo', 'warning');
            return;
        }

        try {
            DesignSystem.setBtnLoading(document.getElementById('btn-confirm-estado'), true);
            const res = await fetch(`/api/maquinas/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nuevoEstado, motivo, categoria })
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Estado de máquina actualizado con éxito');
                this.closeModal();
                this.loadMachines();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        } finally {
            DesignSystem.setBtnLoading(document.getElementById('btn-confirm-estado'), false);
        }
    },

    async viewHistory(id) {
        const machine = this.machines.find(m => m.id === id);
        document.getElementById('historial-title').textContent = `Historial: ${machine.nombre_visible}`;

        try {
            const res = await fetch(`/api/maquinas/${id}/historial`);
            const result = await res.json();
            if (result.success) {
                const list = document.getElementById('historial-list');
                list.innerHTML = result.data.map(h => `
                    <tr>
                        <td>${new Date(h.fecha_hora).toLocaleString()}</td>
                        <td><span class="badge ${this.getStatusClass(h.estado_anterior)}">${(h.estado_anterior || 'N/A').toUpperCase()}</span></td>
                        <td><span class="badge ${this.getStatusClass(h.estado_nuevo)}">${h.estado_nuevo.toUpperCase()}</span></td>
                        <td>
                            <div class="font-xs text-secondary">${h.categoria_motivo || ''}</div>
                            ${h.motivo}
                        </td>
                        <td>${h.usuario}</td>
                    </tr>
                `).join('');
                document.getElementById('modal-historial').classList.add('d-flex');
            }
        } catch (e) {
            DesignSystem.showToast('Error al cargar historial', 'error');
        }
    }
};

window.MaquinaModule = MaquinaModule;
document.addEventListener('DOMContentLoaded', () => MaquinaModule.init());
