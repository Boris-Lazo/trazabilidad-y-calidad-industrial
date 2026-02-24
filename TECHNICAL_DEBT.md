# Deuda Técnica - PROD-SYS

## Seguridad y Logs
- **Registro de contraseñas temporales:** En `backend/domains/personal/personal.service.js`, el sistema registra la contraseña temporal en texto plano en los logs.
  - **Recomendación:** Eliminar el `tempPassword` del log o condicionarlo a entornos que no sean de producción (`NODE_ENV !== 'production'`).

## Arquitectura
- **Inconsistencia de nomenclatura de roles:** Se ha corregido la inconsistencia en `telares.routes.js`, pero se debe auditar el resto de las rutas para asegurar que se utilicen constantes de permisos (`PERMISSIONS`) en lugar de strings de roles hardcodeados.
