
# Bitácora de Telares - Módulo Industrial

Este módulo gestiona el registro operativo de los 13 telares (T-01 a T-13) de la planta.

## Reglas de Negocio Implementadas

### Producción y Desperdicio
- La producción se registra en **METROS** por orden.
- El desperdicio se registra en **KG** por orden.
- **Validación de Consistencia:** Si se registra desperdicio > 0 pero producción = 0, el sistema exige una observación detallada (mínimo 5 caracteres).

### Calidad
- **Parámetro Numérico:** Ancho de tela (pulgadas).
- **Tolerancia:** ± 1/4" respecto al ancho nominal definido en la Orden de Producción.
- **Defectos Visuales:** Registro de ocurrencia por rollo con observación obligatoria.
- **Estado 'Con desviación':** Si cualquier medición de ancho está fuera de tolerancia, el telar se marca automáticamente con este estado al guardar como "Completo".

### Estados del Telar (Semáforos)
- **Sin datos:** Telar sin registros en el turno actual (Gris).
- **Parcial:** Registro iniciado pero incompleto (Amarillo).
- **Completo:** Todos los datos requeridos presentes (Verde).
- **Con desviación:** Datos completos pero con parámetros de calidad fuera de rango (Naranja/Borde Amarillo).
- **Revisión:** Registro con incidentes o rechazos visuales que requieren atención (Rojo).

### Auditoría
- Cada registro guarda automáticamente el `usuario_modificacion` y `fecha_modificacion`.
- El ancho nominal se persiste en el momento del registro para trazabilidad histórica (`valor_nominal` en la tabla `muestras`).

## Uso para el Inspector
1. Abrir la bitácora del turno desde la pantalla principal.
2. Acceder al proceso "Telares" para ver el Panel de Control.
3. Registrar los hallazgos telar por telar.
4. Verificar el cumplimiento global en el Panel de Control antes del cierre del turno.
