# Deuda Técnica - PROD-SYS

## Seguridad y Logs
- [SOLUCIONADO] **Registro de contraseñas temporales:** Se ha corregido en `personal.service.js` para evitar el loggeo en texto plano en producción.

## Arquitectura
- [SOLUCIONADO] **Inconsistencia de nomenclatura de roles:** Se han refactorizado todas las rutas de dominio para usar constantes de `PERMISSIONS`.
- [SOLUCIONADO] **Limpieza de Repositorio:** Se eliminaron parámetros `tx` no utilizados en `GruposRepository`.
- [SOLUCIONADO] **Trazabilidad de Grupos:** Se implementó el historial de membresía y validación de salida.

## Arquitectura Industrial (Pendiente - Análisis 2025)
- [PENDIENTE] **Mapeo de Entidades:** Los servicios dependen de la estructura física SQL. Se requiere capa de Domain Entities.
- [PENDIENTE] **Orquestación de Agregados:** Refactorizar `BitacoraService` como único punto de entrada para mutaciones de registros operativos (Paros, Incidentes).
- [PENDIENTE] **Abstracción de Persistencia:** Migrar gestión manual de esquema en `sqlite.js` a un sistema de migraciones estándar (Knex/Sequelize).
- [PENDIENTE] **Versionado de API:** Implementar prefijos `/api/v1/` para asegurar compatibilidad futura.
- [PENDIENTE] **Fragmentación de Dominio Production:** El dominio es un "mega-monolito". Requiere división en sub-dominios (Execution, Assets, Planning).
