/**
 * GRUPOS DE TURNO — PROD-SYS
 * frontend/public/js/grupos.js
 *
 * Drag & drop con SortableJS:
 *  - Pool "Sin asignar" → grupo: llama POST /api/grupos/:id/integrantes
 *  - Grupo → grupo:       llama POST remove del origen + POST add al destino
 *  - Grupo → pool:        llama POST remove del grupo
 */

const GruposModule = {
    grupos:          [],   // solo operativos, ordenados A-B-C
    staffPool:       [],   // personal de producción sin grupo
    rolesOperativos: [],
    sortableInstances: [],

    // persona_id → grupo_id (para saber de dónde viene al mover)
    personaGrupoMap: {},

    currentPersonaId:  null,
    currentGrupoId:    null,

    CICLO: { T1: 'T3', T3: 'T2', T2: 'T1' },

    // ── Semana ISO ──────────────────────────────────────────
    getISOWeek(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return { week: Math.ceil(((d - y) / 86400000 + 1) / 7), year: d.getUTCFullYear() };
    },

    getMondayOfWeek(week, year) {
        const jan4 = new Date(year, 0, 4);
        const mon  = new Date(jan4);
        mon.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
        return mon;
    },

    formatRango(mon) {
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const f = d => d.toLocaleDateString('es-SV', { day: 'numeric', month: 'short' });
        return `${f(mon)} – ${f(sun)}`;
    },

    renderSemana() {
        const { week, year } = this.getISOWeek(new Date());
        const nw   = week >= 52 ? 1 : week + 1;
        const ny   = week >= 52 ? year + 1 : year;
        const mon  = this.getMondayOfWeek(week, year);
        const nmon = this.getMondayOfWeek(nw, ny);
        document.getElementById('semana-num').textContent          = `Semana ${week}`;
        document.getElementById('semana-rango').textContent        = this.formatRango(mon);
        document.getElementById('semana-siguiente-num').textContent = `Semana ${nw}`;
        document.getElementById('semana-siguiente-rango').textContent = this.formatRango(nmon);
    },

    // ── Init ────────────────────────────────────────────────
    async init() {
        this.renderSemana();
        await this.loadAll();
        this.setupStaticListeners();
    },

    async loadAll() {
        try {
            const [resGrupos, resStaff, resRoles] = await Promise.all([
                fetch('/api/grupos'),
                fetch('/api/personal'),
                fetch('/api/grupos/roles-operativos')
            ]);
            const [rg, rs, rr] = await Promise.all([
                resGrupos.json(), resStaff.json(), resRoles.json()
            ]);

            if (rg.success) {
                this.grupos = rg.data
                    .filter(g => g.tipo !== 'administrativo')
                    .sort((a, b) => a.nombre.localeCompare(b.nombre));
            }
            if (rr.success) {
                this.rolesOperativos = rr.data;
                const sel = document.getElementById('select-rol-operativo');
                if (sel) sel.innerHTML = rr.data
                    .map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
            }

            // Cargar integrantes de cada grupo
            await Promise.all(this.grupos.map(async g => {
                const res = await fetch(`/api/grupos/${g.id}`);
                const r   = await res.json();
                g.integrantes = r.success ? (r.data.integrantes || []) : [];
            }));

            // Construir mapa persona → grupo
            this.personaGrupoMap = {};
            this.grupos.forEach(g => {
                g.integrantes.forEach(i => {
                    this.personaGrupoMap[i.persona_id] = g.id;
                });
            });

            // Personal de producción activo
            if (rs.success) {
                const asignados = new Set(Object.keys(this.personaGrupoMap).map(Number));
                this.staffPool = rs.data.filter(p =>
                    p.area_nombre === 'Producción' &&
                    p.estado_laboral === 'Activo' &&
                    !asignados.has(p.id)
                );
            }

            this.renderGrupos();
            this.renderAsignacion();

        } catch (e) {
            DesignSystem.showToast('Error al cargar datos', 'error');
            console.error(e);
        }
    },

    // ── Render tarjetas de turno ────────────────────────────
    renderGrupos() {
        const grid = document.getElementById('grupos-grid');
        if (!grid) return;
        const { week } = this.getISOWeek(new Date());
        const canEdit  = this._canManage();

        grid.innerHTML = this.grupos.map(g => {
            const t     = g.turno_actual || 'T1';
            const tn    = this.CICLO[t] || 'T1';
            const tc    = t.toLowerCase();
            const tnc   = tn.toLowerCase();
            return `
            <div class="grupo-card">
                <div class="grupo-card-top">
                    <div>
                        <div class="grupo-card-nombre">${g.nombre}</div>
                        <div class="grupo-card-tipo">Grupo Operativo</div>
                    </div>
                    <div class="grupo-semana-num">Sem. ${week}</div>
                </div>
                <div class="grupo-turnos">
                    <div class="grupo-turno-celda">
                        <div class="grupo-turno-etiqueta">Esta semana</div>
                        <div class="turno-circulo ${tc}">${t}</div>
                    </div>
                    <div class="grupo-turno-celda">
                        <div class="grupo-turno-etiqueta">Próxima semana</div>
                        <div class="turno-circulo ${tnc} next">${tn}</div>
                    </div>
                </div>
                ${canEdit ? `
                <div class="grupo-card-footer">
                    <button class="btn btn-secondary btn-sm btn-cambiar-turno"
                            data-grupo-id="${g.id}"
                            data-grupo-nombre="${g.nombre}"
                            data-turno-actual="${t}">
                        <i data-lucide="edit-2" class="btn-cambiar-turno-icon"></i>
                        Cambiar turno
                    </button>
                </div>` : ''}
            </div>`;
        }).join('');

        DesignSystem.initLucide();
    },

    // ── Render zona drag & drop ─────────────────────────────
    renderAsignacion() {
        // Destruir instancias Sortable previas
        this.sortableInstances.forEach(s => s.destroy());
        this.sortableInstances = [];

        const wrapper = document.getElementById('asignacion-wrapper');
        if (!wrapper) return;
        const canEdit = this._canManage();

        // Columnas de grupos
        const colsHTML = this.grupos.map(g => {
            const t  = g.turno_actual || 'T1';
            const tc = t.toLowerCase();
            const sorted = this._sortIntegrantes(g.integrantes || []);
            const items  = sorted.map(i => this._chipHTML(i, canEdit)).join('');
            const empty  = sorted.length === 0
                ? `<div class="drop-empty-msg">
                       <i data-lucide="users" class="drop-empty-icon"></i>
                       Arrastra colaboradores aquí
                   </div>` : '';

            return `
            <div class="grupo-drop-col" id="drop-grupo-${g.id}" data-grupo-id="${g.id}">
                <div class="grupo-drop-header">
                    <div class="grupo-drop-titulo">
                        ${g.nombre}
                        <span class="grupo-drop-turno ${tc}">${t}</span>
                    </div>
                    <span class="grupo-drop-count" id="count-grupo-${g.id}">${sorted.length}</span>
                </div>
                <div class="grupo-drop-list" id="list-grupo-${g.id}">
                    ${items}${empty}
                </div>
            </div>`;
        }).join('');

        // Columna pool sin asignar
        const poolItems = this.staffPool
            .sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`))
            .map(p => this._chipHTMLPool(p)).join('');

        const poolHTML = `
        <div class="pool-col">
            <div class="pool-header">
                <span class="pool-titulo">Sin asignar</span>
                <span class="pool-count" id="count-pool">${this.staffPool.length}</span>
            </div>
            <div class="pool-list" id="list-pool">
                ${poolItems || `<div class="drop-empty-msg">
                    <i data-lucide="check-circle" class="drop-empty-icon"></i>
                    Todo el personal está asignado
                </div>`}
            </div>
        </div>`;

        wrapper.innerHTML = colsHTML + poolHTML;
        DesignSystem.initLucide();

        if (!canEdit) return;

        // Crear instancias Sortable para cada lista
        const allListIds = [
            ...this.grupos.map(g => `list-grupo-${g.id}`),
            'list-pool'
        ];

        allListIds.forEach(listId => {
            const el = document.getElementById(listId);
            if (!el) return;
            const instance = Sortable.create(el, {
                group:     'colaboradores',   // mismo grupo = mover entre listas
                animation: 150,
                ghostClass:  'sortable-ghost',
                chosenClass: 'sortable-chosen',
                handle: '.colab-chip',
                onAdd: (evt) => this._onChipMoved(evt),
                onUpdate: () => {},           // reordenamiento interno (ignorar)
            });
            this.sortableInstances.push(instance);
        });

        // Delegación para botón de rol
        wrapper.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-chip-rol');
            if (!btn) return;
            this.openRolModal(
                parseInt(btn.dataset.personaId),
                btn.dataset.nombre,
                parseInt(btn.dataset.grupoId)
            );
        });
    },

    // ── Callback cuando un chip cambia de lista ─────────────
    async _onChipMoved(evt) {
        const chip       = evt.item;
        const personaId  = parseInt(chip.dataset.personaId);
        const fromListId = evt.from.id;   // list-grupo-X o list-pool
        const toListId   = evt.to.id;

        const fromGrupoId = fromListId.startsWith('list-grupo-')
            ? parseInt(fromListId.replace('list-grupo-', '')) : null;
        const toGrupoId   = toListId.startsWith('list-grupo-')
            ? parseInt(toListId.replace('list-grupo-', '')) : null;

        // Revertir DOM inmediatamente — recargamos desde backend
        chip.remove();

        try {
            // 1. Si venía de un grupo, removerlo
            if (fromGrupoId) {
                const r = await fetch(`/api/grupos/${fromGrupoId}/integrantes/${personaId}/remove`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                const res = await r.json();
                if (!res.success) throw new Error(res.error || 'Error al remover');
            }

            // 2. Si va a un grupo, añadirlo
            if (toGrupoId) {
                const r = await fetch(`/api/grupos/${toGrupoId}/integrantes`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ personaId })
                });
                const res = await r.json();
                if (!res.success) throw new Error(res.error || 'Error al asignar');
            }

            // Recargar todo silenciosamente
            await this.loadAll();

        } catch (e) {
            DesignSystem.showToast(e.message || 'Error al mover colaborador', 'error');
            await this.loadAll(); // revertir estado
        }
    },

    // ── Chip HTML para integrante de grupo ──────────────────
    _chipHTML(i, canEdit) {
        const esInspector = this._esInspector(i.rol_operativo);
        const iniciales   = `${(i.nombre||'?')[0]}${(i.apellido||'?')[0]}`.toUpperCase();
        const inspPill    = esInspector ? '<span class="inspector-pill">Insp.</span>' : '';
        const rolBtn      = canEdit ? `
            <button class="btn-chip-rol"
                    data-persona-id="${i.persona_id}"
                    data-nombre="${i.nombre} ${i.apellido}"
                    data-grupo-id="${this.personaGrupoMap[i.persona_id] || ''}">
                <i data-lucide="edit-3" class="btn-chip-rol-icon"></i>
            </button>` : '';

        return `
        <div class="colab-chip"
             data-persona-id="${i.persona_id}"
             data-nombre="${i.nombre} ${i.apellido}">
            <i data-lucide="grip-vertical" class="drag-handle"></i>
            <div class="colab-chip-avatar ${esInspector ? 'inspector' : ''}">${iniciales}</div>
            <div class="colab-chip-info">
                <div class="colab-chip-nombre">${i.nombre} ${i.apellido} ${inspPill}</div>
                <div class="colab-chip-sub">${i.rol_operativo || 'Sin rol'} · ${i.codigo_interno}</div>
            </div>
            ${rolBtn}
        </div>`;
    },

    // ── Chip HTML para pool sin asignar ─────────────────────
    _chipHTMLPool(p) {
        const iniciales = `${(p.nombre||'?')[0]}${(p.apellido||'?')[0]}`.toUpperCase();
        return `
        <div class="colab-chip"
             data-persona-id="${p.id}"
             data-nombre="${p.nombre} ${p.apellido}">
            <i data-lucide="grip-vertical" class="drag-handle"></i>
            <div class="colab-chip-avatar">${iniciales}</div>
            <div class="colab-chip-info">
                <div class="colab-chip-nombre">${p.nombre} ${p.apellido}</div>
                <div class="colab-chip-sub">${p.rol_organizacional || 'Producción'} · ${p.codigo_interno}</div>
            </div>
        </div>`;
    },

    _sortIntegrantes(list) {
        return [...list].sort((a, b) => {
            const ai = this._esInspector(a.rol_operativo);
            const bi = this._esInspector(b.rol_operativo);
            if (ai && !bi) return -1;
            if (!ai && bi) return  1;
            return `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`);
        });
    },

    _esInspector(rol) {
        return !!(rol && rol.toLowerCase().includes('inspector'));
    },

    _canManage() {
        const user = Auth.getUser();
        return user && !['Inspector', 'Inspector de Calidad', 'Supervisor'].includes(user.rol);
    },

    // ── Event listeners estáticos (modales) ────────────────
    setupStaticListeners() {
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
        });

        // Turno selector
        document.getElementById('turno-selector')?.addEventListener('click', e => {
            const btn = e.target.closest('.turno-opcion');
            if (!btn) return;
            document.querySelectorAll('.turno-opcion').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('turno-selected-value').value = btn.dataset.turno;
        });

        document.getElementById('btn-confirm-turno')?.addEventListener('click', () => {
            this.saveTurno();
        });

        document.getElementById('btn-confirm-rol')?.addEventListener('click', () => {
            this.saveRol();
        });

        // Delegación en grupos-grid para btn-cambiar-turno
        document.getElementById('grupos-grid')?.addEventListener('click', e => {
            const btn = e.target.closest('.btn-cambiar-turno');
            if (btn) this.openTurnoModal(
                parseInt(btn.dataset.grupoId),
                btn.dataset.grupoNombre,
                btn.dataset.turnoActual
            );
        });
    },

    openModal(id)  { const m = document.getElementById(id); if (m) m.style.display = 'flex'; },
    closeModal(id) { const m = document.getElementById(id); if (m) m.style.display = 'none'; },

    openTurnoModal(grupoId, nombre, turnoActual) {
        const { week } = this.getISOWeek(new Date());
        document.getElementById('turno-grupo-id').value = grupoId;
        document.getElementById('modal-turno-grupo-nombre').textContent = nombre;
        document.getElementById('modal-turno-semana').textContent = `Semana ${week}`;
        document.querySelectorAll('.turno-opcion').forEach(b => {
            b.classList.toggle('selected', b.dataset.turno === turnoActual);
        });
        document.getElementById('turno-selected-value').value = turnoActual;
        this.openModal('modal-turno');
    },

    openRolModal(personaId, nombre, grupoId) {
        this.currentPersonaId = personaId;
        this.currentGrupoId   = grupoId;
        document.getElementById('rol-colaborador-nombre').textContent = nombre;
        this.openModal('modal-rol');
    },

    // ── API calls ───────────────────────────────────────────
    async saveTurno() {
        const grupoId    = document.getElementById('turno-grupo-id').value;
        const nuevoTurno = document.getElementById('turno-selected-value').value;
        if (!nuevoTurno) { DesignSystem.showToast('Selecciona un turno', 'warning'); return; }
        try {
            const r = await fetch(`/api/grupos/${grupoId}/turno`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nuevoTurno })
            });
            const res = await r.json();
            if (res.success) {
                DesignSystem.showToast('Turno actualizado', 'success');
                this.closeModal('modal-turno');
                await this.loadAll();
            } else {
                DesignSystem.showToast(res.error || 'Error al guardar', 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        }
    },

    async saveRol() {
        const rolOperativoId = document.getElementById('select-rol-operativo').value;
        try {
            const r = await fetch(`/api/grupos/persona/${this.currentPersonaId}/rol-operativo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rolOperativoId })
            });
            const res = await r.json();
            if (res.success) {
                DesignSystem.showToast('Rol actualizado', 'success');
                this.closeModal('modal-rol');
                await this.loadAll();
            } else {
                DesignSystem.showToast(res.error || 'Error al guardar', 'error');
            }
        } catch (e) {
            DesignSystem.showToast('Error de red', 'error');
        }
    }
};

window.GruposModule = GruposModule;
document.addEventListener('DOMContentLoaded', () => GruposModule.init());