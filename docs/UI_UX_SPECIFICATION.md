# Especificación de UI/UX Industrial: PROD-SYS

Este documento define la arquitectura de experiencia de usuario para el sistema de control en planta, diseñada para minimizar el error humano y maximizar la eficiencia operativa bajo presión.

## 1. Mapa de Pantallas

### 1.1 Dashboard de Turno (Centro de Control)
Pantalla principal que visualiza el estado global de la planta.
- **Header Persistente**: Muestra [Turno Actual] | [Grupo] | [Inspector] | [Tiempo Transcurrido].
- **Grilla de Procesos**: Tarjetas visuales para cada uno de los 9 procesos (Extrusión, Telares, etc.).
    - Cada tarjeta muestra: Nombre, Estado (Color), Última actualización y Botón de Acción contextualmente habilitado.

### 1.2 Panel de Registro Unificado (Por Proceso)
Vista de captura de datos filtrada por proceso.
- **Pestaña Producción**: Lista de máquinas autorizadas. Campos de entrada para OP, Cantidad y Merma.
- **Pestaña Calidad**: Formulario de parámetros técnicos. Resalta valores fuera de rango en rojo inmediatamente.
- **Pestaña Paros**: Línea de tiempo de incidentes y motivos.

### 1.3 Asignación de Personal
Pantalla para el Supervisor/Inspector para vincular operarios a máquinas y turnos.
- **Matriz de Disponibilidad**: Cruce de Operario vs. Proceso habilitado.

### 1.4 Centro de Cierre y Revisión
Pantalla que resume las desviaciones antes del cierre de bitácora.
- **Checklist de Integridad**: Lista de "Por qué no puedes cerrar todavía".

---

## 2. Flujos por Rol

### 2.1 Flujo del Inspector: Apertura y Cierre
1. **Apertura**: Selección de Turno -> Sistema sugiere automáticamente el siguiente turno cronológico -> Confirmación.
2. **Monitoreo**: Supervisión visual de los estados de cada proceso en el Dashboard.
3. **Cierre**: Clic en "Cerrar Turno" -> Sistema detecta procesos en `REVISIÓN` -> Inspector debe ingresar observaciones justificativas -> Transición a `CERRADA`.

### 2.2 Flujo del Operario: Registro de Producción
1. **Selección**: Toca la tarjeta de su proceso.
2. **Identificación**: Selecciona su máquina. El sistema precarga la Orden de Producción activa.
3. **Captura**: Ingresa cantidad. Si la cantidad es > 20% superior al histórico, la UI pide confirmación extra ("¿Es correcta esta cifra?").
4. **Finalización**: Guarda registro.

### 2.3 Flujo del Supervisor: Corrección Auditada
1. **Acceso**: Entra a Bitácoras `CERRADAS`.
2. **Modificación**: Al intentar cambiar un dato, aparece un modal obligatorio: "Motivo de Corrección".
3. **Rastro**: La UI muestra el valor anterior tachado y el nuevo resaltado.

---

## 3. Reglas de Habilitación / Bloqueo

- **Bloqueo por Estado**: Si la Bitácora está `CERRADA`, todos los botones de "Guardar" o "Editar" desaparecen y se sustituyen por un banner de "Solo Lectura".
- **Habilitación Progresiva**: El botón "Cerrar Bitácora" permanece deshabilitado (gris) si existen procesos `SIN_DATOS` que tienen personal asignado.
- **Validación en Calidad**: Los campos de parámetros de calidad bloquean el guardado si el valor ingresado es físicamente imposible (ej. Temperatura < 0 en un extrusor).
- **Asignación de Máquinas**: Solo se muestran para registro las máquinas marcadas como `OPERATIVA` en el módulo de activos.

---

## 4. Mensajes Críticos de UI

| Evento | Tipo de Mensaje | Contenido Sugerido |
| :--- | :--- | :--- |
| **Fuera de Rango** | Crítico (Rojo) | "ATENCIÓN: El Denier ingresado (500) está fuera del límite (700-900). Se marcará como RECHAZO." |
| **Cierre Bloqueado** | Alerta (Amarillo) | "No se puede cerrar: El Telar 7 no tiene producción registrada pero tiene un operario asignado." |
| **Error de SAP** | Error (Rojo) | "La Orden de Producción 4001234 no pertenece a este proceso (Imprenta)." |
| **Éxito de Cierre** | Éxito (Verde) | "Bitácora guardada con éxito. Los datos ahora son inmutables." |

---

## 5. Errores Humanos que la UI Previene

- **Cierre de Turno Erróneo**: La UI impide cerrar si hay incidentes abiertos sin comentarios, evitando lagunas en la auditoría.
- **Doble Captura**: Al registrar producción para una máquina, el sistema muestra el último valor guardado hace X minutos para evitar registros duplicados por confusión.
- **Identificación de OP**: Uso de escáner o selección de lista filtrada para evitar que el operario escriba manualmente 7 dígitos y se equivoque.
- **Olvido de Merma**: Si se ingresa una producción inusualmente alta, el sistema pregunta: "¿Se generó desperdicio en esta corrida?".

---

## 6. Decisiones que la UI NO permite tomar

- **Cambiar el Turno Retroactivamente**: No se puede abrir una bitácora para "ayer" si ya existe una cerrada para "hoy".
- **Saltarse Parámetros Obligatorios**: El formulario de calidad no permite "Guardar" si falta una métrica definida como obligatoria en el contrato.
- **Asignar Personal a Máquinas de Baja**: La interfaz de asignación filtra automáticamente activos no operativos.
- **Borrar Registros**: No existe el botón "Eliminar". Solo existe "Corregir", que requiere justificación y mantiene el historial.
