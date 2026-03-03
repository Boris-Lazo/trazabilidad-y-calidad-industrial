# Documentación de Estabilización de Desarrollo y UX — PROD-SYS

Este documento resume las correcciones y mejoras realizadas para estabilizar el entorno de desarrollo, mejorar la experiencia de usuario (UX) y robustecer el flujo de importación masiva.

## 1. Permisos en Etapa de Desarrollo
- **Cambio realizado:** Se modificó el middleware `backend/middlewares/authorize.js`.
- **Detalle:** Se ha comentado la lógica de validación de permisos (enforcement). Actualmente, el sistema valida que el usuario esté autenticado, pero permite el acceso a todos los módulos y acciones independientemente del rol asignado.
- **Impacto:** Todos los usuarios (incluyendo el primer administrador creado) tienen acceso total al Dashboard, Órdenes, Bitácoras y demás módulos administrativos.

## 2. Estabilización de Sesión
- **Corrección de Token:** Se detectó un error en `frontend/public/js/ordenes_importar.js` donde se intentaba recuperar el token de sesión usando una clave genérica (`token`) en lugar de la clave del sistema (`prod_sys_token`). Esto provocaba errores 401 durante la carga de archivos SAP.
- **Interceptor de Fetch:** Se refinó el interceptor global en `frontend/public/js/auth.js` para diferenciar entre errores de sesión real (token expirado/inválido) y errores funcionales o de acceso denegado.
- **Cierre de Sesión:** El sistema ya no cierra la sesión automáticamente ante errores 403 (Prohibido) a menos que el mensaje del servidor indique explícitamente que la cuenta ha sido desactivada.

## 3. Manejo de Errores y UX
- **Eliminación de alert():** Se han reemplazado las llamadas a `alert()` en los módulos de Órdenes, Importación, Telares y Procesos.
- **Nuevo Modal Estándar:** Se implementó `DesignSystem.showErrorModal()` en el core del sistema de diseño. Este modal es no intrusivo, permite al usuario cerrar la alerta sin perder el trabajo realizado en formularios o previsualizaciones, y mantiene la coherencia visual con la aplicación industrial.
- **Notificaciones Toast:** Para éxitos y confirmaciones menores, se integraron notificaciones tipo "Toast" que no bloquean la interacción.

## 4. Importación Masiva (SAP) y Mapeo Técnico
- **Identificadores Técnicos:** Se ha reforzado el uso de IDs técnicos en lugar de nombres visibles.
- **Robustez de Máquinas:**
    - Se agregó una columna `codigo` única e inmutable a la tabla `MAQUINAS`.
    - La lógica de negocio (especialmente en el proceso de Conversión y validaciones de la máquina CONV#03) ahora utiliza este código técnico (`CONV03`) en lugar del nombre visible.
    - Los "Contratos de Proceso" se actualizaron para referenciar máquinas permitidas mediante estos códigos.
- **Independencia de Nombres:** Dado que las importaciones de órdenes desde SAP solo crean registros de `orden_produccion` y el sistema interno mapea estas órdenes a máquinas mediante IDs numéricos o códigos técnicos, cualquier cambio en el "Nombre Visible" (ej. cambiar "T-01" por "Telar Principal 1") no afectará la integridad de los datos ni romperá el flujo de importación o planificación.

## 5. Funcionamiento de la Previsualización
- El usuario selecciona el archivo Excel de SAP.
- El sistema procesa el archivo en el backend usando el `ordenProduccion.parser.js`, mapeando los procesos de SAP a IDs internos.
- La previsualización muestra una tabla interactiva donde los errores se resaltan visualmente y se describen mediante el nuevo sistema de modales, sin interrumpir la sesión del usuario.
- Una vez revisados los datos, la confirmación realiza la carga final en base de datos.
