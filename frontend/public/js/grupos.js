/**
 * GESTIÓN DE GRUPOS - PROD-SYS
 */

const GruposModule = {
    grupos: [],
    staff: [],
    rolesOperativos: [],
    currentGrupoId: null,
    currentPersonaId: null,

    async init() {
        await this.loadGrupos();
        await this.loadCatalogs();
        this.setupEventListeners();
    },

    async loadGrupos() {
        try {
            const res = await fetch('/api/grupos');
            const result = await res.json();
            if (result.success) {
                this.grupos = result.data;
                this.renderGruposList();
            }
        } catch (error) {
            DesignSystem.showToast('Error al cargar grupos', 'error');
        }
    },

    async loadCatalogs() {
        try {
            // Cargar Roles Operativos
            const resRoles = await fetch('/api/grupos/roles-operativos');
            const resultRoles = await resRoles.json();
            if (resultRoles.success) {
                this.rolesOperativos = resultRoles.data;
                const select = document.getElementById('select-rol-operativo');
                if (select) {
                    select.innerHTML = this.rolesOperativos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
                }
            }

            // Cargar Personal (para añadir a grupos)
            const resStaff = await fetch('/api/personal');
            const resultStaff = await resStaff.json();
            if (resultStaff.success) {
                this.staff = resultStaff.data;
                const select = document.getElementById('select-persona');
                if (select) {
                    select.innerHTML = '<option value="">Seleccione colaborador...</option>' +
                        this.staff.map(p => `<option value="${p.id}">${p.nombre} ${p.apellido} (${p.codigo_interno})</option>`).join('');
                }
            }
        } catch (e) {
            console.error('Error al cargar catálogos:', e);
        }
    },

    renderGruposList() {
        const list = document.getElementById('lista-grupos');
        if (!list) return;

        list.innerHTML = this.grupos.map(g => `
            <div class="list-group-item ${this.currentGrupoId === g.id ? 'active' : ''}" data-id="${g.id}" style="cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">${g.nombre}</div>
                        <div style="font-size: 12px; opacity: 0.8;">${g.tipo === 'operativo' ? 'Producción' : 'Administración'}</div>
                    </div>
                    <span class="badge ${g.tipo === 'operativo' ? 'badge-info' : 'badge-secondary'}">${g.turno_actual}</span>
                </div>
            </div>
        `).join('');
    },

    async selectGrupo(id) {
        this.currentGrupoId = id;
        this.renderGruposList();

        const user = Auth.getUser();
        const isReadOnly = user && (user.rol === 'Inspector' || user.rol === 'Inspector de Calidad');

        if (isReadOnly) {
            if (!document.getElementById('readonly-notice-grupos')) {
                const notice = document.createElement('div');
                notice.id = 'readonly-notice-grupos';
                notice.className = 'badge badge-warning mb-3 w-100';
                notice.style.padding = '10px';
                notice.innerHTML = '<i data-lucide="info" style="width:14px; height:14px; vertical-align:middle; margin-right:8px;"></i> Información histórica y no editable para Inspectores.';
                const container = document.getElementById('detalle-grupo-container');
                container.insertBefore(notice, container.firstChild);
                DesignSystem.initLucide();
            }
        }

        document.getElementById('no-grupo-selected').style.display = 'none';
        document.getElementById('detalle-grupo-container').style.display = 'flex';

        try {
            const res = await fetch(`/api/grupos/${id}`);
            const result = await res.json();
            if (result.success) {
                const g = result.data;
                document.getElementById('grupo-nombre-titulo').textContent = g.nombre;
                document.getElementById('grupo-tipo-badge').textContent = g.tipo === 'operativo' ? 'Grupo Operativo de Producción' : 'Grupo de Personal Administrativo';
                document.getElementById('grupo-turno-actual').textContent = g.turno_actual;

                // Mostrar/Ocultar control de turno (fijo para administrativos)
                const btnRotar = document.getElementById('btn-rotar-turno');
                if (btnRotar) {
                    btnRotar.style.display = (g.tipo === 'administrativo' || isReadOnly) ? 'none' : 'block';
                }

                const btnAdd = document.getElementById('btn-add-integrante');
                if (btnAdd) {
                    btnAdd.style.display = isReadOnly ? 'none' : 'block';
                }

                this.renderIntegrantes(g.integrantes);
                this.renderHistorial(g.historial);
            }
        } catch (e) {
            DesignSystem.showToast('Error al cargar detalle del grupo', 'error');
        }
    },

    renderIntegrantes(integrantes) {
        const tbody = document.getElementById('lista-integrantes');
        if (!tbody) return;

        const user = Auth.getUser();
        const isReadOnly = user && (user.rol === 'Inspector' || user.rol === 'Inspector de Calidad');

        if (integrantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-secondary">No hay integrantes en este grupo</td></tr>';
            return;
        }

        tbody.innerHTML = integrantes.map(i => `
            <tr>
                <td style="font-weight: 500;">${i.nombre} ${i.apellido}</td>
                <td><code>${i.codigo_interno}</code></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>${i.rol_operativo || '<em class="text-secondary">Sin asignar</em>'}</span>
                        ${!isReadOnly ? `
                        <button class="btn btn-secondary btn-sm btn-edit-rol" style="padding: 2px 4px;" data-id="${i.persona_id}" data-nombre="${i.nombre} ${i.apellido}">
                            <i data-lucide="edit-3" style="width:12px; height:12px;"></i>
                        </button>` : ''}
                    </div>
                </td>
                <td>
                    ${!isReadOnly ? `
                    <button class="btn btn-danger btn-sm btn-remove-integrante" data-id="${i.persona_id}" data-nombre="${i.nombre} ${i.apellido}" title="Remover del grupo">
                        <i data-lucide="user-minus" style="width:14px; height:14px;"></i>
                    </button>` : '<span class="badge badge-secondary">Activo</span>'}
                </td>
            </tr>
        `).join('');
        DesignSystem.initLucide();
    },

    renderHistorial(historial) {
        const tbody = document.getElementById('lista-historial-integrantes');
        if (!tbody) return;

        if (!historial || historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-secondary" style="font-size: 13px;">No hay registros históricos</td></tr>';
            return;
        }

        tbody.innerHTML = historial.map(h => {
            const fechaDesde = new Date(h.fecha_desde).toLocaleString();
            const fechaHasta = h.fecha_hasta ? new Date(h.fecha_hasta).toLocaleString() : '<span class="text-success">Vigente</span>';
            const esPasado = !!h.fecha_hasta;

            return `
                <tr style="${esPasado ? 'opacity: 0.7; background-color: rgba(0,0,0,0.02);' : 'font-weight: 500;'}">
                    <td>${h.nombre} ${h.apellido}</td>
                    <td style="font-size: 12px;">${fechaDesde}</td>
                    <td style="font-size: 12px;">${fechaHasta}</td>
                    <td style="font-size: 12px; font-style: italic;">${h.motivo || '-'}</td>
                </tr>
            `;
        }).join('');
    },

    setupEventListeners() {
        const user = Auth.getUser();
        const isReadOnly = user && (user.rol === 'Inspector' || user.rol === 'Inspector de Calidad');

        const btnAdd = document.getElementById('btn-add-integrante');
        if (btnAdd) btnAdd.addEventListener('click', () => this.openModal('modal-integrante'));

        const btnRotar = document.getElementById('btn-rotar-turno');
        if (btnRotar) btnRotar.addEventListener('click', () => {
            const turnoActual = document.getElementById('grupo-turno-actual').textContent.trim();
            const siguiente = this.getNextTurno(turnoActual);
            document.getElementById('turno-siguiente-display').textContent = this.getTurnoLabel(siguiente);
            document.getElementById('turno-siguiente-value').value = siguiente;
            this.openModal('modal-turno');
        });

        const btnNuevo = document.getElementById('btn-nuevo-grupo');
        if (btnNuevo) {
            if (isReadOnly) btnNuevo.remove();
            else btnNuevo.addEventListener('click', () => this.openModal('modal-nuevo-grupo'));
        }

        const selectTipo = document.getElementById('nuevo-grupo-tipo');
        if (selectTipo) {
            selectTipo.addEventListener('change', (e) => {
                const container = document.getElementById('nuevo-grupo-turno-container');
                container.style.display = e.target.value === 'administrativo' ? 'none' : 'block';
            });
        }

        const btnConfirmNuevo = document.getElementById('btn-confirm-nuevo-grupo');
        if (btnConfirmNuevo) btnConfirmNuevo.addEventListener('click', () => this.createGrupo());

        const btnConfirmAdd = document.getElementById('btn-confirm-add');
        if (btnConfirmAdd) btnConfirmAdd.addEventListener('click', () => this.addIntegrante());

        const btnConfirmTurno = document.getElementById('btn-confirm-turno');
        if (btnConfirmTurno) btnConfirmTurno.addEventListener('click', () => this.saveTurno());

        const btnConfirmRol = document.getElementById('btn-confirm-rol');
        if (btnConfirmRol) btnConfirmRol.addEventListener('click', () => this.saveRol());

        const btnConfirmRemove = document.getElementById('btn-confirm-remove');
        if (btnConfirmRemove) btnConfirmRemove.addEventListener('click', () => this.removeIntegrante());

        // Manejo de cierre de modales por data-attribute (evita inline JS bloqueado por CSP)
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close;
                this.closeModal(modalId);
            });
        });

        // Event Delegation para lista de grupos
        const listGrupos = document.getElementById('lista-grupos');
        if (listGrupos) {
            listGrupos.addEventListener('click', (e) => {
                const item = e.target.closest('.list-group-item');
                if (item && item.dataset.id) {
                    this.selectGrupo(parseInt(item.dataset.id));
                }
            });
        }

        // Event Delegation para lista de integrantes
        const listIntegrantes = document.getElementById('lista-integrantes');
        if (listIntegrantes) {
            listIntegrantes.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('.btn-edit-rol');
                const btnRemove = e.target.closest('.btn-remove-integrante');

                if (btnEdit) {
                    this.openRolModal(parseInt(btnEdit.dataset.id), btnEdit.dataset.nombre);
                } else if (btnRemove) {
                    this.openRemoveModal(parseInt(btnRemove.dataset.id), btnRemove.dataset.nombre);
                }
            });
        }
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    },

    openRolModal(personaId, nombre) {
        this.currentPersonaId = personaId;
        const label = document.getElementById('rol-colaborador-nombre');
        if (label) label.textContent = nombre;
        this.openModal('modal-rol');
    },

    openRemoveModal(personaId, nombre) {
        this.currentPersonaId = personaId;
        const text = document.getElementById('remove-text');
        if (text) text.innerHTML = `¿Está seguro de que desea remover a <strong>${nombre}</strong> del grupo actual?`;
        this.openModal('modal-remove');
    },

    async addIntegrante() {
        const personaId = document.getElementById('select-persona').value;
        const motivo = document.getElementById('integrante-motivo').value;
        const es_correccion = document.getElementById('integrante-es-correccion').checked;

        if (!personaId || !motivo) {
            DesignSystem.showToast('Debe seleccionar un colaborador y proporcionar un motivo', 'warning');
            return;
        }

        try {
            const res = await fetch(`/api/grupos/${this.currentGrupoId}/integrantes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personaId, motivo, es_correccion })
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Integrante añadido con éxito');
                this.closeModal('modal-integrante');
                document.getElementById('form-integrante').reset();
                this.selectGrupo(this.currentGrupoId);
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        }
    },

    async saveTurno() {
        const nuevoTurno = document.getElementById('turno-siguiente-value').value;
        if (!nuevoTurno) {
            DesignSystem.showToast('No se pudo determinar el turno siguiente', 'error');
            return;
        }
        try {
            const res = await fetch(`/api/grupos/${this.currentGrupoId}/turno`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nuevoTurno })
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Turno rotado con éxito');
                this.closeModal('modal-turno');
                this.selectGrupo(this.currentGrupoId);
                this.loadGrupos();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        }
    },

    async saveRol() {
        const rolOperativoId = document.getElementById('select-rol-operativo').value;
        const motivo = document.getElementById('rol-motivo').value;
        const es_correccion = document.getElementById('rol-es-correccion').checked;

        if (!motivo) {
            DesignSystem.showToast('El motivo es obligatorio', 'warning');
            return;
        }

        try {
            const res = await fetch(`/api/grupos/persona/${this.currentPersonaId}/rol-operativo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rolOperativoId, motivo, es_correccion })
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Rol operativo actualizado');
                this.closeModal('modal-rol');
                document.getElementById('form-rol').reset();
                this.selectGrupo(this.currentGrupoId);
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        }
    },

    async removeIntegrante() {
        const motivo = document.getElementById('remove-motivo').value;
        const es_correccion = document.getElementById('remove-es-correccion').checked;

        if (!motivo) {
            DesignSystem.showToast('El motivo es obligatorio', 'warning');
            return;
        }

        try {
            const res = await fetch(`/api/grupos/${this.currentGrupoId}/integrantes/${this.currentPersonaId}/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo, es_correccion })
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Colaborador removido del grupo');
                this.closeModal('modal-remove');
                document.getElementById('remove-motivo').value = '';
                this.selectGrupo(this.currentGrupoId);
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        }
    },

    async createGrupo() {
        const nombre = document.getElementById('nuevo-grupo-nombre').value;
        const tipo = document.getElementById('nuevo-grupo-tipo').value;
        const turno_actual = tipo === 'administrativo' ? 'T4' : document.getElementById('nuevo-grupo-turno').value;

        if (!nombre) {
            DesignSystem.showToast('El nombre del grupo es obligatorio', 'warning');
            return;
        }

        try {
            DesignSystem.setBtnLoading('btn-confirm-nuevo-grupo', true);
            const res = await fetch('/api/grupos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, tipo, turno_actual })
            });
            const result = await res.json();
            if (result.success) {
                DesignSystem.showToast('Grupo creado con éxito');
                this.closeModal('modal-nuevo-grupo');
                document.getElementById('form-nuevo-grupo').reset();
                await this.loadGrupos();
            } else {
                DesignSystem.showToast(result.error, 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        } finally {
            DesignSystem.setBtnLoading('btn-confirm-nuevo-grupo', false);
        }
    },

    getNextTurno(turnoActual) {
        // Orden solicitado: T3 -> T2 -> T1 -> T3
        const ciclo = { 'T3': 'T2', 'T2': 'T1', 'T1': 'T3' };
        return ciclo[turnoActual] || 'T3';
    },

    getTurnoLabel(turno) {
        const labels = { 'T1': 'Turno 1 (Mañana)', 'T2': 'Turno 2 (Tarde)', 'T3': 'Turno 3 (Noche)' };
        return labels[turno] || turno;
    },
};


window.GruposModule = GruposModule;
document.addEventListener('DOMContentLoaded', () => GruposModule.init());
