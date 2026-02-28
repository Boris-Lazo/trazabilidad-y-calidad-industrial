# Modelo de Dominio Formal: Turno, Bitácora y Ejecución de Órdenes

Este documento define el modelo de dominio conceptual para el sistema de control industrial, enfocado en la integridad de datos, trazabilidad absoluta y auditoría estricta.

## 1. Mapa de Entidades del Dominio

### 1.1 Bitácora de Turno (Entidad Raíz / Aggregate Root)
Es el contenedor legal y operativo de toda actividad en planta. Representa el acto formal de un turno de trabajo.
- **Atributos**: Periodo operativo, turno asignado (T1-T4), inspector responsable, estado, timestamp apertura/cierre, justificaciones auditadas.
- **Responsabilidad**: Garantizar que ninguna acción (producción, calidad, paro) ocurra fuera de su contexto.

### 1.2 Turno (Identidad Temporal)
Entidad detectada automáticamente por el sistema según la hora, pero sujeta a corrección administrativa auditada.
- **Atributos**: Identificador (T1, T2, T3, T4), Horario teórico, Grupo operativo asignado (A, B, C o Administrativo).

### 1.3 ProcesoPorTurno (Agregado Intermedio)
Instancia específica de un proceso (ej. Extrusor PP) ejecutándose dentro de una Bitácora.
- **Atributos**: Referencia al contrato técnico del proceso (1-9), estado de completitud, tiempo programado (default 480 min), responsable operativo.
- **Responsabilidad**: Contener las ejecuciones de órdenes, registros de calidad, paros y desperdicios del proceso específico.

### 1.4 Ejecución de Orden (Entidad de Auditoría)
Representa la transformación real de materiales vinculada a una Orden de Producción.
- **Atributos**: Referencia a OP, Máquina (Activo), Secuencia de eventos (inicio/pausa/fin), operario responsable, métricas producidas.
- **Responsabilidad**: Rastrear el uso de activos y cumplimiento de órdenes en el tiempo real de la bitácora.

### 1.5 Orden de Producción (Referencia Externa)
Entidad inmutable importada de SAP.
- **Atributos**: Código de 7 dígitos (prefijo indica proceso), parámetros técnicos, producto objetivo.
- **Responsabilidad**: Definir el "qué" debe hacerse, sin tener estado operativo propio en planta.

---

## 2. Relaciones entre Entidades

- **Bitácora de Turno [1] -- [N] ProcesoPorTurno**: Una bitácora orquesta múltiples procesos simultáneos.
- **ProcesoPorTurno [1] -- [N] Ejecución de Orden**: Las órdenes se ejecutan dentro del contexto de un proceso y un turno.
- **Ejecución de Orden [N] -- [1] Máquina**: Toda ejecución debe estar vinculada a un activo autorizado por el contrato del proceso.
- **Ejecución de Orden [N] -- [1] Orden de Producción**: Referencia externa obligatoria para trazabilidad SAP.

---

## 3. Máquinas de Estado

### 3.1 Bitácora de Turno
| Estado | Transiciones Permitidas | Rol Autorizado | Restricción |
| :--- | :--- | :--- | :--- |
| **ABIERTA** | -> EN_REVISION, -> CERRADA | Inspector | Permite ingreso de datos operativos. |
| **EN_REVISION** | -> ABIERTA, -> CERRADA | Inspector, Supervisor | Requiere observaciones de justificación por cada desviación. |
| **CERRADA** | -> CORREGIDA | Administrador | **Inmutable**. Bloquea cualquier modificación operativa. |
| **CORREGIDA** | - | Administrador | Estado terminal. Indica corrección post-cierre con rastro de auditoría. |

### 3.2 ProcesoPorTurno
| Estado | Transiciones Permitidas | Definición |
| :--- | :--- | :--- |
| **SIN_DATOS** | -> PARCIAL | Estado inicial. Sin registros de producción/calidad. |
| **PARCIAL** | -> COMPLETO, -> EN_REVISION | Registros presentes pero insuficientes según frecuencia de contrato. |
| **COMPLETO** | -> EN_REVISION | Cumple con métricas, personal asignado y frecuencia de calidad. |
| **EN_REVISION** | -> COMPLETO | Marcado ante anomalías (ej. Rechazos de calidad o incidentes). |

### 3.3 Ejecución de Orden
| Estado | Transiciones Permitidas | Significado |
| :--- | :--- | :--- |
| **IN_PROGRESS** | -> PAUSED, -> FINISHED | La máquina está procesando la orden. |
| **PAUSED** | -> IN_PROGRESS, -> FINISHED | Interrupción temporal (cambio de turno, mantenimiento). |
| **FINISHED** | - | Orden completada en este proceso para este turno. |

---

## 4. Reglas Duras del Sistema (No Negociables)

1. **Inmutabilidad Operativa**: Una vez que una Bitácora pasa a `CERRADA`, ningún dato (producción, paros, calidad) puede ser modificado o eliminado.
2. **Principio de Bitácora Única**: No se permite la coexistencia de dos bitácoras abiertas para el mismo grupo/turno en traslape temporal.
3. **Validación SAP 7-Dígitos**: El sistema debe bloquear ejecuciones de órdenes cuyo primer dígito no coincida con el `processId` del ProcesoPorTurno.
4. **Balance de Tiempos**: `Tiempo Programado (480) = Tiempo Efectivo + Total Paros`. No se permiten cierres con tiempos negativos o excedentes sin justificación en `EN_REVISION`.
5. **Auditoría Transversal**: Toda transición de estado y corrección de datos debe registrar: Quién, Cuándo, Por Qué, Valor Anterior y Valor Nuevo.

---

## 5. Acciones NO Permitidas

- **Eliminación de Registros**: Queda estrictamente prohibido el borrado físico de cualquier dato. Los errores se gestionan mediante estados de corrección.
- **Registros Anacrónicos**: No se permite ingresar datos con fecha/hora fuera del rango operativo de la Bitácora actual.
- **Cierre con Ejecuciones Activas**: No se puede cerrar una Bitácora si existe alguna Ejecución de Orden en estado `IN_PROGRESS`. Debe ser pausada o finalizada.
- **Salto de Jerarquía**: No se pueden registrar producciones o mermas si no están vinculadas a un ProcesoPorTurno activo.

---

## 6. Errores Operativos que el Dominio Debe Prevenir

- **Fuga de Trazabilidad**: Impedir que una orden sea procesada en una máquina no autorizada por su contrato técnico.
- **Inconsistencia de Calidad**: Impedir el marcado de un ProcesoPorTurno como `COMPLETO` si no se cumple con la frecuencia mínima de muestreo (ej. 3 muestras por turno).
- **Traslape de Responsabilidad**: Bloquear la apertura de una Bitácora si el Inspector responsable no tiene una sesión válida o ya tiene otra bitácora abierta.
- **Dato Huérfano**: Bloquear el registro de producción si el proceso no tiene personal mínimo asignado en el turno correspondiente.
