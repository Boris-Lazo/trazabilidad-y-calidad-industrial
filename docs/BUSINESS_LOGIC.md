# Lógica de Negocio Industrial: PROD-SYS

PROD-SYS ha sido diseñado para reflejar y digitalizar fielmente los procesos de una planta de fabricación real, desde la extrusión de polímeros hasta la confección de sacos industriales.

---

## 🏭 Los 9 Procesos Productivos

El sistema se basa en 9 contratos técnicos inmutables que definen cada área de la planta:

1.  **Extrusor PP:** Fabricación de cinta de polipropileno.
2.  **Telares:** Tejido de tela circular a partir de cintas de PP.
3.  **Laminado:** Recubrimiento de tela con película plástica.
4.  **Imprenta:** Personalización de sacos con diseños específicos.
5.  **Conversión:** Corte y costura de sacos de polipropileno.
6.  **Extrusión PE:** Fabricación de película de polietileno (liner).
7.  **Conv. Liner:** Confección de recubrimientos internos (liners).
8.  **Peletizado:** Recuperación de merma y desperdicio plástico.
9.  **Sacos Vestidos:** Proceso final de acabado de productos complejos.

Cada proceso tiene su propia lógica de **métricas obligatorias**, **roles permitidos** (ej. Tejedor, Inspector de Calidad) y **máquinas autorizadas**.

---

## 👥 Grupos y Turnos Rotativos

La planta opera las 24 horas del día, los 7 días de la semana, mediante un sistema de grupos y turnos:

### Grupos Operativos (A, B, C)
Estos grupos rotan semanalmente a través de tres turnos de 8 horas:
- **Turno 1 (T1):** Mañana.
- **Turno 2 (T2):** Tarde.
- **Turno 3 (T3):** Noche.
*Ejemplo: El Grupo A puede estar en T1 esta semana y pasar a T2 la siguiente.*

### Grupo Administrativo
Trabaja en un horario fijo denominado **Turno 4 (T4)**. Este grupo no participa en la producción directa, sino en tareas de soporte y gerencia.

---

## 📒 La Bitácora de Turno (Ciclo de Vida)

La bitácora es el documento digital que registra todo lo sucedido durante un turno de trabajo. Su ciclo de vida es crítico para la trazabilidad:

1.  **ABIERTA:** El inspector de turno inicia la bitácora. Durante este estado, los operarios pueden registrar producción, mermas e incidentes.
2.  **REVISIÓN:** Si al intentar cerrar el turno se detectan anomalías (ej. un proceso sin personal asignado o incidentes sin observaciones), la bitácora entra en estado de revisión. Requiere una justificación obligatoria del inspector.
3.  **CERRADA:** Una vez validados todos los datos y justificaciones, la bitácora se cierra. Los datos se vuelven inmutables para reportes históricos.

---

## 🏷️ Órdenes de Producción y Lotes

El sistema integra el flujo de materiales:
- **Órdenes de Producción (OP):** Identificadas por un código de 7 dígitos. El primer dígito indica el proceso (ej. una orden que empieza por '2' es para Telares).
- **Lotes:** Cada OP genera uno o varios lotes de producto. Un lote agrupa la producción física bajo condiciones similares para permitir su rastreo en caso de fallas de calidad.

---

## 🔒 Roles y Permisos (RBAC)

PROD-SYS distingue entre dos tipos de roles:

### Roles de Sistema (Accesos)
- **Administrador:** Control total, configuración y usuarios.
- **Inspector:** Responsable de abrir/cerrar turnos y validar calidad.
- **Supervisor:** Gestiona personal y asignaciones operativas.
- **Operario:** Registra datos de producción y mermas.

### Roles Organizacionales/Operativos (Función en planta)
Definen la especialidad del trabajador: *Tejedor, Mecánico, Urdidor, Auxiliar, etc.* Estos roles son independientes de los permisos de sistema; un "Operario" (permiso de sistema) puede ser un "Tejedor" (función operativa).
