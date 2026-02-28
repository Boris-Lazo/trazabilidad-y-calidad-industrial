# Modelo de Dominio: Turnos, Bitácoras y Ejecución de Órdenes

Este documento define el modelo de dominio formal para el sistema de control industrial, enfocado en la trazabilidad operativa y la integridad de los datos en planta.

## 1. Mapa de Entidades del Dominio

### 1.1 Bitácora de Turno (Entidad Raíz / Aggregate Root)
Representa la unidad fundamental de auditoría y operación. Es el contenedor legal de todo lo ocurrido en un periodo de tiempo determinado.
- **Atributos Clave**: Periodo operativo, Turno asignado, Inspector responsable, Estado operativo, Timestamp de apertura/cierre, Justificación de desviaciones.

### 1.2 Turno (Valor de Dominio)
Define la ventana temporal y el equipo de trabajo.
- **Atributos Clave**: Identificador (T1, T2, T3, T4), Horario teórico, Grupo asignado.
- **Nota**: Su detección es automática por hora de sistema pero su asignación es auditable.

### 1.3 ProcesoPorTurno (Agregado Intermedio)
Instancia de un Proceso Industrial (ej. Extrusión PP) dentro de una Bitácora específica.
- **Atributos Clave**: Referencia al Contrato de Proceso, Estado de completitud, Tiempo programado, Resumen de métricas.

### 1.4 Ejecución de Orden (Entidad de Ejecución)
Representa el trabajo real realizado sobre una Orden de Producción.
- **Atributos Clave**: Referencia a OP (SAP), Máquina/Activo utilizado, Secuencia de eventos, Operario responsable, Cantidad producida, Merma generada.

### 1.5 Orden de Producción (Referencia Externa)
Entidad estática proveniente de SAP.
- **Atributos Clave**: Código OP (7 dígitos), Parámetros técnicos, Producto objetivo, Cantidad teórica.

---

## 2. Relaciones entre Entidades

- Una **Bitácora de Turno** posee N **ProcesosPorTurno**.
- Un **ProcesoPorTurno** pertenece a una única **Bitácora de Turno**.
- Un **ProcesoPorTurno** actúa como contenedor para N **Ejecuciones de Orden**, N **Registros de Calidad** y N **Eventos de Paro**.
- Una **Ejecución de Orden** referencia a una **Orden de Producción** estática, pero su ciclo de vida es independiente.
- Toda **Ejecución de Orden** debe estar vinculada a una **Máquina** autorizada por el contrato del proceso.

---

## 3. Estados y Transiciones

### 3.1 Máquina de Estados: Bitácora de Turno
| Estado | Transiciones Permitidas | Rol Autorizado | Restricciones |
| :--- | :--- | :--- | :--- |
| **ABIERTA** | -> EN_REVISION, -> CERRADA | Inspector | Permite registros de producción y calidad. |
| **EN_REVISION** | -> ABIERTA, -> CERRADA | Inspector, Supervisor | Requiere observaciones obligatorias por cada proceso marcado. |
| **CERRADA** | -> CORREGIDA | Administrador | **Inmutable**. No permite edición de datos operativos. |
| **CORREGIDA** | - | Administrador | Estado final tras un ajuste auditado. Genera un nuevo evento de auditoría vinculante. |

### 3.2 Máquina de Estados: ProcesoPorTurno
| Estado | Transiciones Permitidas | Definición |
| :--- | :--- | :--- |
| **SIN_DATOS** | -> PARCIAL | Estado inicial. No hay registros de producción ni calidad. |
| **PARCIAL** | -> COMPLETO, -> EN_REVISION | Existen datos pero no cumplen con la frecuencia de muestreo o el cierre de órdenes. |
| **COMPLETO** | -> EN_REVISION | Cumple con todas las métricas obligatorias y cierres de ejecución. |
| **EN_REVISION** | -> COMPLETO | Detectado por el sistema o marcado por el Inspector ante anomalías (ej. Rechazo de calidad). |

### 3.3 Máquina de Estados: Ejecución de Orden
| Estado | Transiciones Permitidas | Significado Operativo |
| :--- | :--- | :--- |
| **EN_PROGRESO** | -> PAUSADA, -> FINALIZADA | La máquina está transformando material vinculado a la OP. |
| **PAUSADA** | -> EN_PROGRESO, -> FINALIZADA | El trabajo se detiene por cambio de turno, mantenimiento o paro operativo. |
| **FINALIZADA** | - | La orden ha completado su paso por este proceso en este turno. |
| **CANCELADA** | - | Cierre administrativo de la ejecución por error de asignación. |

---

## 4. Reglas Duras del Sistema

1. **Principio de Bitácora Única**: No puede existir más de una Bitácora en estado `ABIERTA` o `EN_REVISION` simultáneamente.
2. **Identidad de Proceso**: Un `ProcesoPorTurno` no puede iniciarse si el `Contrato de Proceso` no está en estado `Activo`.
3. **Cierre Condicionado**: Una Bitácora no puede pasar a `CERRADA` si existe algún `ProcesoPorTurno` con datos de producción pero sin el personal mínimo requerido asignado.
4. **Integridad de Tiempos**: La suma de `TiempoEfectivo` + `TiempoTotalParos` debe ser igual al `TiempoProgramado` del proceso. No se permiten tiempos negativos.
5. **Auditoría de Corrección**: Cualquier cambio en una Bitácora `CERRADA` debe disparar una transición a `CORREGIDA`, exigiendo un `Motivo de Cambio` y preservando el valor original en el log de auditoría.

---

## 5. Acciones NO Permitidas

- **Eliminación Física**: Ningún registro de producción, calidad o bitácora puede ser borrado de la base de datos.
- **Registro Anacrónico**: No se pueden registrar datos de producción con timestamps fuera del rango de apertura/cierre de la Bitácora.
- **Salto de Proceso**: No se puede ejecutar una OP en un proceso que no coincida con su código identificador (ej. OP que inicia con '1' solo en Extrusión PP).
- **Cierre con Pendientes**: No se permite cerrar una Bitácora si hay una `Ejecución de Orden` en estado `EN_PROGRESO` sin una pausa o finalización registrada para el corte de turno.

---

## 6. Errores Operativos que el Dominio Debe Prevenir

- **Duplicidad de Órdenes**: Evitar que una misma OP se ejecute en dos máquinas distintas para el mismo proceso simultáneamente, a menos que el contrato lo autorice explícitamente.
- **Inconsistencia de Calidad**: Impedir la finalización de un `ProcesoPorTurno` si las muestras de calidad obligatorias (según frecuencia del contrato) no han sido registradas.
- **Fuga de Responsabilidad**: Impedir la apertura de una Bitácora si el Inspector identificado no cuenta con una sesión activa y válida en el sistema.
- **Traslape de Turnos**: Bloquear la creación de una Bitácora cuya fecha operativa sea inferior a la última Bitácora cerrada (garantía de avance lineal en el tiempo).
