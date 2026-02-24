# Deuda Técnica - PROD-SYS

## Seguridad y Logs
- [SOLUCIONADO] **Registro de contraseñas temporales:** Se ha corregido en `personal.service.js` para evitar el loggeo en texto plano en producción.

## Arquitectura
- [SOLUCIONADO] **Inconsistencia de nomenclatura de roles:** Se han refactorizado todas las rutas de dominio para usar constantes de `PERMISSIONS`.
- [SOLUCIONADO] **Limpieza de Repositorio:** Se eliminaron parámetros `tx` no utilizados en `GruposRepository`.
- [SOLUCIONADO] **Trazabilidad de Grupos:** Se implementó el historial de membresía y validación de salida.
