# Modelo de Datos: PROD-SYS

PROD-SYS utiliza **SQLite** como motor de persistencia, configurado con parámetros de alto rendimiento para entornos industriales concurrentes.

---

## 🏗️ Arquitectura de la Base de Datos

El diseño sigue una normalización de tercer grado (3NF) para asegurar la integridad de los datos y evitar redundancias innecesarias.

### Core de Producción
- **orden_produccion:** Cabecera de las órdenes (ej. producto, cantidad objetivo, estado).
- **bitacora_turno:** Registro de cada turno de trabajo (ej. fecha operativa, inspector, estado).
- **lineas_ejecucion:** El nexo entre una orden y una máquina. Permite rastrear qué se está fabricando y en qué estado se encuentra.
- **registros_trabajo:** Captura de datos operativos (ej. cantidad producida, merma, parámetros técnicos).
- **MAQUINAS:** Activos físicos autorizados por proceso.

### Calidad y Trazabilidad
- **lotes:** Agrupaciones físicas de producción vinculadas a una orden.
- **muestras:** Resultados de análisis técnicos (ej. gramaje, resistencia, dimensiones) comparados contra un valor nominal esperado.

### Personal y Accesos
- **personas:** El registro único de cada colaborador (nombre, apellido, código interno).
- **usuarios:** Las credenciales de acceso al sistema vinculadas a una persona (username, hash de contraseña, rol).
- **grupos:** Organización de personal para la rotación de turnos.
- **grupo_integrantes:** Historial de pertenencia de una persona a un grupo.

### Sistema y Auditoría
- **auditoria:** Registro detallado de cada modificación de estado o dato sensible.
- **sistema_config:** Tabla de clave-valor para configuraciones globales del software (ej. `estado_sistema`).

---

## 🔄 Estrategia de Migraciones Robustas

Dado que SQLite no permite algunas operaciones de modificación de columnas (ej. cambiar una columna a `NOT NULL`), PROD-SYS implementa un patrón de **Recreación y Copia**:

1.  **Crear Tabla Temporal:** Se genera una tabla `_new` con el esquema actualizado.
2.  **Copiar Datos:** Se insertan los registros de la tabla original en la nueva.
3.  **Intercambiar:** Se elimina la tabla original y se renombra la temporal.
4.  **Transaccional:** Todo el proceso ocurre dentro de una transacción de base de datos (`BEGIN TRANSACTION / COMMIT`) para garantizar que el sistema no quede en un estado inconsistente en caso de falla.

---

## 🛡️ Restricciones de Integridad (CHECK)

El sistema utiliza restricciones a nivel de base de datos para prevenir estados inválidos:
- **Estados de Usuario:** `Activo`, `Suspendido`, `Bloqueado`, `Baja lógica`.
- **Estados de Bitácora:** `ABIERTA`, `REVISION`, `CERRADA`.
- **Estados de Orden:** `Creada`, `Liberada`, `En producción`, `Pausada`, `Cerrada`, `Cancelada`.

Estas reglas se aplican incluso si la lógica de la aplicación falla, actuando como una red de seguridad final.

---

## 🔍 Índices Críticos

Para garantizar tiempos de respuesta rápidos en reportes y búsquedas, el sistema cuenta con índices en columnas clave:
- `idx_usuarios_username`: Aceleración del login.
- `idx_bitacora_fecha`: Consultas de historial por fecha.
- `idx_orden_codigo`: Búsqueda rápida de órdenes por su identificador de 7 dígitos.
- `idx_muestras_lote`: Trazabilidad instantánea de calidad por lote.
