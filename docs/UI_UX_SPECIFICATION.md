# Especificación de UI/UX Industrial: PROD-SYS

Este documento define la arquitectura de experiencia de usuario para el sistema de control en planta, diseñada para minimizar el error humano y maximizar la eficiencia operativa bajo presión. Sigue la filosofía de "Guiar y Bloquear".

## 1. Mapa de Pantallas

### 1.1 Dashboard de Turno (Centro de Control)
Pantalla principal que visualiza el estado global de la planta.
- **Header Persistente**: Muestra [Turno Actual] | [Grupo] | [Inspector] | [Tiempo Transcurrido]. Visible en todo momento.
- **Grilla de Procesos**: Tarjetas visuales para cada uno de los 9 procesos (Extrusión, Telares, etc.).
    - Cada tarjeta muestra: Nombre, Estado (Color), Última actualización y Botón de Acción contextualmente habilitado.
- **Barra de Estado Inferior**: Alertas críticas pendientes (procesos sin datos, rechazos de calidad).

### 1.2 Panel de Registro Unificado (Por Proceso)
Vista de captura de datos filtrada por proceso.
- **Contexto del Proceso**: Nombre, Máquina(s) asignada(s) y Tiempo Programado (480 min).
- **Pestaña Producción**: Lista de máquinas autorizadas.
    - Campos: OP (Sugerida de SAP), Cantidad (Último valor sugerido), Merma.
- **Pestaña Calidad**: Formulario de parámetros técnicos.
    - Resalta valores fuera de rango en rojo inmediatamente.
    - Campos obligatorios marcados con asterisco rojo; el botón "Guardar" está bloqueado hasta completarlos.
- **Pestaña Paros y Desperdicio**: Línea de tiempo de incidentes y motivos.

### 1.3 Asignación de Personal
Pantalla para el Supervisor/Inspector para vincular operarios a máquinas y turnos.
- **Matriz de Disponibilidad**: Cruce de Operario vs. Proceso habilitado.
- **Bloqueo**: No permite asignar personal a máquinas en estado "Baja" o "Fuera de Servicio".

### 1.4 Centro de Cierre y Revisión de Bitácora
Pantalla que resume las desviaciones antes del cierre.
- **Checklist de Integridad**: Lista dinámica de "Por qué no puedes cerrar todavía" (ej. "Faltan 2 muestras de calidad en Proceso 1").
- **Sección de Justificación**: Campo de texto obligatorio si la bitácora entra en `EN_REVISION`.

---

## 2. Flujos por Rol

### 2.1 Flujo del Inspector: Apertura y Cierre
1. **Apertura**: El sistema sugiere el turno (T1, T2, T3) basado en la hora. El Inspector confirma o corrige (con rastro de auditoría).
2. **Monitoreo**: El Dashboard muestra procesos en `SIN_DATOS`, `PARCIAL` o `COMPLETO`. El Inspector actúa sobre los rojos/amarillos.
3. **Cierre**: Al intentar cerrar, si el balance de tiempo es negativo o hay rechazos, el flujo se desvía a `EN_REVISION`, obligando a escribir la justificación.

### 2.2 Flujo del Operario: Registro de Producción
1. **Acceso**: Toca la tarjeta de su proceso. Solo ve procesos donde está asignado.
2. **Registro**:
    - **OP**: Selecciona de una lista de órdenes "Liberadas" para evitar errores de escritura.
    - **Cantidad**: El sistema muestra: "Anterior: 1500 kg. Sugerido: 1500 kg".
    - **Validación**: Si ingresa "0" sin registrar un Paro, la UI lanza alerta: "¿Desea registrar un paro operativo?".

### 2.3 Flujo del Supervisor: Corrección con Auditoría
1. **Historial**: Accede a bitácoras `CERRADAS`.
2. **Edición**: Al tocar un dato, se abre un modal: "Estás corrigiendo un dato histórico".
    - **Campo Obligatorio**: Motivo del cambio (Selección de catálogo: Error Captura, Ajuste, etc. + Comentario).
3. **Visualización**: El dato antiguo queda visible tachado junto al nuevo valor.

---

## 3. Comportamiento de Campos y Estados

| Campo | Estado | Comportamiento UI |
| :--- | :--- | :--- |
| **Orden de Producción** | Sugerido | Filtrado por los 7 dígitos de SAP y estado de la orden. |
| **Cantidades** | Obligatorio | No permite valores negativos. Sugiere el último valor para rapidez. |
| **Parámetros de Calidad** | Bloqueado | Si el valor es > al límite físico, el campo vibra y se pone rojo; impide el guardado. |
| **Observaciones** | Sugerido | Opcional en `ABIERTA`, **Obligatorio** en `EN_REVISION` o `CORREGIDA`. |
| **Inspector/Turno** | Bloqueado | Una vez abierta la bitácora, estos campos no se cambian sin un evento de auditoría. |

---

## 4. Mensajes Críticos de UI (Lenguaje Humano)

- **"No puedes cerrar"**: "Falta registrar la producción de la Máquina X. Tienes 480 minutos programados y solo has justificado 200."
- **"Valor Inusual"**: "Has ingresado 5000kg, lo cual es el doble de lo normal. ¿Estás seguro de que este valor es correcto?"
- **"Orden Inválida"**: "Esta Orden de Producción corresponde a Telares, pero estás en Extrusión. Verifica el código SAP."
- **"Bitácora Cerrada"**: "Esta información es de solo lectura. Para realizar cambios, contacta al Administrador para una corrección auditada."

---

## 5. Errores Humanos que la UI Previene

- **Cierre Incompleto**: El botón de cierre solo se activa cuando el Checklist de Integridad está en verde (o cuando se provee justificación en Revisión).
- **Doble Registro**: Si un operario intenta registrar producción en una máquina donde ya hay un registro activo en el mismo turno, la UI pregunta: "¿Deseas actualizar el registro anterior o añadir uno nuevo?".
- **Olvido de Turno**: Si el sistema detecta que han pasado 8 horas, lanza una alerta visual en todas las pantallas: "El turno ha terminado. Por favor, procede al cierre de la bitácora."
- **Error de Identificación**: Uso de colores semafóricos (Verde/Amarillo/Rojo) para indicar el estado de cada proceso sin que el usuario deba leer textos largos.

---

## 6. Decisiones que la UI NO permite tomar

- **Eliminar Datos**: No existe el botón de borrar. Solo existe "Corregir".
- **Saltarse Calidad**: No se puede marcar un proceso como `COMPLETO` si no se han llenado las muestras obligatorias definidas en el contrato.
- **Registrar fuera de Turno**: La UI bloquea ingresos de datos con hora de sistema que no correspondan al rango de la bitácora abierta.
- **Ignorar Rechazos**: Si una muestra de calidad da "Rechazo", la bitácora se marca automáticamente como `EN_REVISION` y no puede cerrarse como `CERRADA` directamente.
