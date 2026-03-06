# PROD-SYS — Documento de Contexto para Claude

> Sube este archivo al inicio de cada chat nuevo para retomar sin perder contexto.

---

## Proyecto

Sistema de gestión de producción para planta de sacos PP/PE.  
Repositorio: `trazabilidad-y-calidad-industrial-main/`

**Stack:**
- Backend: Node.js + Express + SQLite (`backend/`)
- Frontend: HTML/CSS/JS vanilla + design system propio (`frontend/public/`)
- Auth: JWT, `Auth.getUser()` → `{ id, usuario_id, username, rol, nombre }`
- Dark mode: clase `.dark` en `<html>` vía `ThemeManager`

---

## Convenciones del proyecto

| Tema | Regla |
|------|-------|
| Errores de negocio | `throw new ValidationError('mensaje')` |
| Errores de DB | `throw new DatabaseError(...)` |
| Respuestas API | `{ success: true, data: ... }` / `{ success: false, error: '...' }` |
| Toast frontend | `DesignSystem.showToast('msg', 'success'|'error'|'warning')` |
| Iconos | Lucide via `https://unpkg.com/lucide@latest` (CSP solo permite unpkg.com) |
| Drag & drop | SortableJS `https://unpkg.com/sortablejs@1.15.0/Sortable.min.js` |
| Formularios | **Sin `<form>` tags**, usar `addEventListener` |
| Estilos inline | **Prohibidos**, todo en el CSS del módulo |
| Auth middleware | `authorize(PERMISSIONS.MANAGE_STAFF)` en rutas de escritura |
| CSS módulo | Un archivo por página: `frontend/public/css/[modulo].css` |
| CSS variables | `--bg-primary`, `--bg-alt`, `--text-primary`, `--text-secondary`, `--primary`, `--border`, `--border-medium` |

**Variables CSS disponibles (design-system):**

```
Light:  --bg-primary:#F4F6F8  --bg-alt:#F8FAFC  --border:#E4E7EB  --border-medium:#CBD2D9
Dark:   --bg-primary:#111827  --bg-alt:#374151  --border:#374151  --border-medium:#4B5563
```

---

## Módulos implementados

| Módulo | Ruta HTML | Estado |
|--------|-----------|--------|
| Dashboard | `index.html` | ✅ |
| Personal (Lista) | `personal.html` | ✅ |
| Grupos de Turno | `grupos.html` | ✅ completo |
| Producción | `produccion.html` | ✅ |
| Planificación | `planificacion.html` | ✅ |
| Lotes | `lotes.html` | ✅ |
| Máquinas | `maquinas.html` | ✅ |
| Auditoría | `auditoria.html` | ✅ |

---

## Módulo: Grupos de Turno ✅

### Archivos
```
frontend/public/grupos.html
frontend/public/js/grupos.js
frontend/public/css/grupos.css
backend/domains/grupos/grupos.routes.js
backend/domains/grupos/grupos.controller.js
backend/domains/grupos/grupos.service.js
backend/domains/grupos/grupos.repository.js
backend/shared/scheduler/turnoScheduler.js
backend/database/sqlite.js
```

### Schema DB
```sql
grupos (
  id, nombre, tipo TEXT CHECK('operativo'|'administrativo'),
  turno_actual TEXT,     -- T1/T2/T3
  turno_siguiente TEXT,  -- T1/T2/T3
  activo BOOLEAN
)
grupo_integrantes (id, grupo_id, persona_id, fecha_desde, fecha_hasta, motivo, asignado_por)
persona_roles_operativos (id, persona_id, rol_operativo_id, fecha_desde, fecha_hasta)
```

### API Endpoints grupos
```
GET  /api/grupos                              → lista grupos activos
GET  /api/grupos/:id                          → detalle + integrantes
GET  /api/grupos/roles-operativos             → roles operativos
PUT  /api/grupos/:id/turno                    → { nuevoTurno, campo }
       campo = 'turno_actual' | 'turno_siguiente'
POST /api/grupos/:id/integrantes              → { personaId }
POST /api/grupos/:id/integrantes/:pid/remove  → {}
POST /api/grupos/persona/:pid/rol-operativo   → { rolOperativoId }
```

### Lógica de negocio grupos
- **Ciclo:** T1 → T3 → T2 → T1  (`CICLO = { T1:'T3', T3:'T2', T2:'T1' }`)
- Solo personal área `Producción` con `estado_laboral = 'Activo'` va al pool
- Inspector de Calidad aparece primero (pill dorado "Insp.")
- Grupos `administrativo` tienen turno fijo T4, no se cambia
- `_canManage()` retorna `true` si `user.rol === null` (admin bootstrap)
- Recuadros T1/T2/T3 son `<button>` clickeables directamente
- Cada tarjeta tiene **dos celdas clickeables**: Esta semana y Próxima semana

### CSS Layout asignación — CRÍTICO
```
.asignacion-grupos-row → overflow:visible  (NUNCA hidden — rompe el drag)
```

### Scheduler rotación automática
`backend/shared/scheduler/turnoScheduler.js`
- Lunes 00:05 AM — `setTimeout` nativo, sin dependencias externas
- `turno_actual ← turno_siguiente`, `turno_siguiente ← CICLO[nuevo_actual]`
- Idempotente: clave `turno_ultima_rotacion_automatica` en `sistema_config` (valor: `"YYYY-Www"`)
- Registrado en `server.js`: `iniciarTurnoScheduler(sqlite)` tras `initDB()`

### Turnos T5 y T6 — pendiente módulo Planificación
- T5: Sábados 07:00–11:00 (4h, demanda baja)
- T6: Sábados 11:00–15:00 (4h, demanda baja)

---

## Módulo: Contratos de Proceso

### Estado completo de todos los procesos

| ID | Nombre | Máquina(s) | Domain files | Sección HTML | Estado |
|----|--------|------------|--------------|-------------|--------|
| 1 | Extrusor PP | EXTPP01 | `extrusorPP.*` | section-extrusor-pp | ✅ |
| 2 | Telares | TEL-xx | `telares.*` | genérico | ✅ |
| 3 | Laminado | LAM | `laminado.*` | section-laminado | ✅ |
| 4 | Imprenta | IMP | `imprenta.*` | section-imprenta | ✅ |
| 5 | Conversión Sacos | CONV | `conversion.*` | genérico | ✅ |
| 6 | Extrusión PE | EXTPE01, EXTPE02 | `extrusionPE.*` | section-extrusion-pe | ✅ NUEVO |
| 7 | Conversión Liner PE | CONV-LI | `linerPE.*` | genérico | ✅ |
| 8 | Peletizado | PELET | `peletizado.*` | section-peletizado | ✅ NUEVO |
| 9 | Conversión Sacos Vestidos | CONV-V | `vestidos.*` | genérico | ✅ |

### Archivos frontend de proceso
```
frontend/public/proceso.html   ← secciones específicas por proceso
frontend/public/js/proceso.js  ← initProcesoUI(), buildPayload(), cargarDatosExistentes()
```

### Patrón para agregar un nuevo proceso específico en proceso.js
```javascript
// 1. specificProcesses
const specificProcesses = [1, 3, 4, 6, 8];  // agregar el nuevo ID

// 2. Ocultar sección en initProcesoUI
document.getElementById('section-[nombre]').style.display = 'none';

// 3. Mostrar con elif
} else if (pId === N) { document.getElementById('section-[nombre]').style.display = 'block'; }

// 4. DETALLE_ENDPOINTS[N]  = '/api/[ruta]/detalle?bitacora_id=...'
// 5. PROCESO_ENDPOINTS[N]  = '/api/[ruta]/guardar'
// 6. buildPayload: if (pId === N) { return { ... }; }
// 7. cargarDatosExistentes: else if (pId === N) { ... }
```

---

## Proceso 6 — Extrusión PE ✅

### Archivos backend
```
backend/domains/production/extrusionPE.repository.js
backend/domains/production/extrusionPE.service.js
backend/domains/production/extrusionPE.controller.js
backend/domains/production/extrusionPE.routes.js   → /api/extrusion-pe
```

### Tablas DB
```sql
extru_pe_rollos (
  id, bitacora_id, maquina_id, orden_id,
  codigo_rollo TEXT, peso_kg REAL,
  registro_trabajo_id, usuario_modificacion, created_at
)
extru_pe_muestras (
  id, bitacora_id, maquina_id, orden_id,
  lectura_indice INTEGER,        -- 1..4
  espesor_mm REAL,
  ancho_burbuja REAL,            -- pulgadas, step 0.125
  microperforado INTEGER,        -- 0/1
  espesor_resultado TEXT,        -- Cumple / No cumple
  ancho_resultado TEXT,
  usuario_modificacion, created_at
)
```

### Lógica
- 2 máquinas independientes: EXTPE01, EXTPE02 — 1 registro por máquina activa
- Producción: lista dinámica de rollos (código + kg), total en tiempo real
- Calidad: 4 lecturas fijas (L1–L4) por turno con espesor, ancho burbuja, microperforado
- Tolerancias: espesor ±10% nominal, ancho ±0.25 pulgadas
- Estado: Sin datos → Parcial → Completo (rollos + 4 lecturas) → Con desviación
- Lote: `{codigo_orden}-EXTPE01-001`
- Código de orden debe iniciar con `"6"`

### API
```
GET  /api/extrusion-pe/detalle?bitacora_id=X[&maquina_id=Y]
POST /api/extrusion-pe/guardar
     { bitacora_id, maquina_id, orden_id, rollos[], muestras[],
       merma_kg, materias_primas[], observaciones }
```

---

## Proceso 8 — Peletizado ✅

### Archivos backend
```
backend/domains/production/peletizado.repository.js
backend/domains/production/peletizado.service.js
backend/domains/production/peletizado.controller.js
backend/domains/production/peletizado.routes.js   → /api/peletizado
```

### Tabla DB
```sql
peletizado_inspecciones (
  id, bitacora_id, maquina_id, orden_id,
  inspeccion_indice INTEGER,  -- 1=inicio_turno, 2=cierre_turno
  momento TEXT,               -- 'inicio_turno' | 'cierre_turno'
  color_pelet TEXT, tipo_material TEXT,
  usuario_modificacion, created_at
)
```

### Lógica
- 1 máquina: PELET
- Producción: bolsas de 25 kg nominales
  - Operario ingresa: `bolsas_producidas` + `peso_real_kg`
  - Sistema calcula: `peso_teorico = bolsas × 25`, `diferencia = peso_real - peso_teorico`
  - Diferencia informativa (no bloquea). Color: verde ≤5%, amarillo >5%
- Campo texto libre: tipo de desperdicio que entró (ej: "Merma Extrusor PP + Telares")
- 2 inspecciones fijas: Inicio de turno y Cierre de turno
  - Cada una: `color_pelet` y `tipo_material` (texto libre)
- Estado: Completo con bolsas + peso_real + 2 inspecciones
- Lote: `{codigo_orden}-PELET-001`
- Código de orden debe iniciar con `"8"`
- Recibe mermas de procesos 1,2,3,4,5 → entrega pellet a procesos 1 y 3

### API
```
GET  /api/peletizado/detalle?bitacora_id=X
POST /api/peletizado/guardar
     { bitacora_id, orden_id, bolsas_producidas, peso_real_kg,
       tipo_desperdicio_entrada, inspecciones[], merma_kg, observaciones }
```

---

## Arquitectura de domain por proceso — Patrón estándar

```
[proceso].repository.js  ← getMaquina(), CRUD rollos/inspecciones, saveEstadoMaquina()
[proceso].service.js     ← validaciones + withTransaction() + cálculo de estado
[proceso].controller.js  ← getDetalle / guardarDetalle  (usa req.user.nombre || req.user.username)
[proceso].routes.js      ← GET /detalle + POST /guardar, con authorize(PERMISSIONS.*)
```

**Estado de proceso** (`bitacora_maquina_status`): Sin datos → Parcial → Completo → Con desviación  
→ Siempre con `ON CONFLICT(bitacora_id, maquina_id) DO UPDATE`

**Lotes**: `loteService.getByBitacoraYOrden()` antes de crear. Formato: `{codigo_orden}-{MAQUINA}-{NNN}`

**Tablas nuevas en sqlite.js**: insertar con `CREATE TABLE IF NOT EXISTS` antes del bloque `RECURSO`

---

## Notas de arquitectura

- **CSP:** solo `unpkg.com` para scripts externos. Nunca `cdnjs.cloudflare.com`
- **Migración de columnas:** `sqlite.js` → array `columnsToAdd` (idempotente)
- **`req.user.persona_id`** puede ser `null` para admin bootstrap
- El servidor corre en `localhost:3000`
- **Reiniciar servidor** después de cambios en `sqlite.js` para aplicar migraciones

---

## Próximas etapas

- [ ] Módulo **Planificación**: incorporar T5 y T6 para sábados de demanda baja
- [ ] Validación en entorno real de procesos 6 y 8