# Análisis Arquitectónico y Deuda Técnica: PROD-SYS

Este documento detalla los puntos de mejora y la deuda técnica identificada en el sistema industrial PROD-SYS, enfocado en la escalabilidad, mantenibilidad e integridad de los datos.

## 1. Acoplamiento en Repositorios y Persistencia

### 1.1. Ausencia de Capa de Mapeo (Entities)
*   **Descripción:** Los servicios operan directamente sobre objetos planos (JSON) devueltos por SQLite. No existen clases de dominio o entidades que encapsulen el comportamiento y las reglas de los datos.
*   **Severidad:** Alta.
*   **Impacto:** Los cambios en el esquema de la base de datos se filtran a todas las capas. Si se renombra una columna o se migra a un motor con diferentes convenciones (ej. camelCase vs snake_case), se requerirá refactorizar gran parte de los servicios y controladores.
*   **Recomendación:** Implementar clases de Entidad (ej. `BitacoraEntity`) y un Mapper en los repositorios para convertir filas SQL en objetos de dominio ricos.

### 1.2. Lógica de Negocio en SQL
*   **Descripción:** Consultas complejas en los repositorios (ej. `BitacoraRepository.getInspectores`) contienen filtros basados en permisos y estados laborales que pertenecen a la lógica de negocio.
*   **Severidad:** Media.
*   **Impacto:** Dificulta la auditoría de reglas de negocio al estar "escondidas" en sentencias SQL. Impide la reutilización de lógica de validación.
*   **Recomendación:** Recuperar conjuntos de datos más generales y aplicar filtros de dominio en el Service, o utilizar el patrón *Specification* para definir criterios de búsqueda reutilizables.

### 1.3. Acoplamiento al Motor SQLite
*   **Descripción:** El archivo `backend/database/sqlite.js` gestiona el esquema de forma imperativa y manual, utilizando sintaxis específica de SQLite (`ON CONFLICT`, `PRAGMA`).
*   **Severidad:** Media.
*   **Impacto:** Riesgo de inconsistencias en el esquema al escalar. Una migración a PostgreSQL o un entorno de microservicios sería costosa y propensa a errores.
*   **Recomendación:** Adoptar una herramienta de migraciones estándar (Knex.js, Sequelize Migrations) que provea una abstracción del DDL y soporte versionado de esquema.

---

## 2. Estructura del Dominio Production

### 2.1. Riesgo de "Mega-Dominio"
*   **Descripción:** La carpeta `domains/production` contiene demasiadas entidades y responsabilidades (Bitácoras, Órdenes, Paros, Incidentes, Contratos de procesos).
*   **Severidad:** Alta.
*   **Impacto:** El mantenimiento se vuelve complejo a medida que se añaden nuevos procesos industriales. Los archivos de servicio (ej. `bitacora.service.js`) tienden a crecer indefinidamente (God Objects).
*   **Recomendación:** Fragmentar en sub-dominios: `execution`, `planning`, `assets` y `industrial-contracts`.

### 2.2. Debilidad en el Aggregate Root (Bitácora)
*   **Descripción:** Aunque la Bitácora es el centro operativo, los servicios como `ParoService` e `IncidenteService` permiten crear registros hijos de forma autónoma.
*   **Severidad:** Alta.
*   **Impacto:** Posibilidad de estados inconsistentes. Se pueden añadir paros o incidentes a una bitácora que ya ha sido enviada a revisión o cerrada si no existe una orquestación centralizada estricta.
*   **Recomendación:** Todas las operaciones sobre "hijos" de la bitácora deben ser orquestadas por el `BitacoraService` para asegurar que el estado global permita la mutación.

### 2.3. Dispersión de Reglas Temporales y de Turno
*   **Descripción:** El cálculo de tiempos programados, minutos perdidos y validaciones de "fuera de horario" están duplicados en varios servicios.
*   **Severidad:** Media.
*   **Impacto:** Errores de redondeo o discrepancias en la lógica de tiempo entre diferentes pantallas de registro.
*   **Recomendación:** Centralizar la lógica temporal en un `OperationalContext` o un Value Object `ShiftDuration`.

---

## 3. Escalabilidad Futura

### 3.1. Ausencia de Versionado de API
*   **Descripción:** Las rutas actuales cuelgan directamente de `/api/`.
*   **Severidad:** Media.
*   **Impacto:** Imposibilidad de realizar despliegues incrementales o mantener compatibilidad con versiones anteriores del frontend o integraciones de terceros.
*   **Recomendación:** Prefijar las rutas con versión (ej. `/api/v1/`).

### 3.2. Gestión de Contratos Estáticos (`ProcessRegistry`)
*   **Descripción:** La lógica industrial reside en clases de contrato que se importan como singletons globales.
*   **Severidad:** Baja.
*   **Impacto:** Dificulta el testing y el intercambio dinámico de reglas (ej. diferentes configuraciones de máquina para diferentes plantas).
*   **Recomendación:** Inyectar los contratos en los servicios mediante el constructor (Inyección de Dependencias).

---
*Preparado por: Jules, Arquitecto de Software Senior.*
