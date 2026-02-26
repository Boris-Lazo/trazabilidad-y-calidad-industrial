# Arquitectura del Sistema: PROD-SYS

PROD-SYS utiliza una arquitectura modular basada en **Dominios**, diseñada para ser escalable, mantenible y robusta ante cambios operacionales complejos. Cada dominio encapsula su propia lógica de negocio, validaciones y acceso a datos.

---

## 🏗️ Capas de Software

El sistema está organizado en 4 capas principales para separar responsabilidades de manera clara:

### 1. Capa de Rutas (Routes)
Define los puntos de entrada (endpoints) de la API. Se encarga de la exposición de servicios y la aplicación de middlewares de seguridad (autenticación y autorización).

### 2. Capa de Controladores (Controllers)
Orquestan la interacción entre la petición HTTP y la lógica de negocio.
- Extraen parámetros de la petición.
- Llaman a los servicios correspondientes.
- Formatean y envían la respuesta estándar al cliente.

### 3. Capa de Servicios (Services)
Es el **corazón del sistema**. Aquí reside toda la lógica de negocio industrial:
- Validaciones complejas (ej. "no cerrar turno si hay procesos en revisión").
- Orquestación de múltiples repositorios.
- Gestión de transacciones para asegurar la integridad de los datos.

### 4. Capa de Repositorios (Repositories)
Única capa autorizada para realizar consultas SQL a la base de datos SQLite.
- Abstraen la persistencia de datos.
- Proporcionan métodos semánticos (ej. `getInspectores()` en lugar de una consulta SQL genérica).

---

## 🧩 Organización por Dominios

PROD-SYS no es un monolito indivisible, sino un conjunto de módulos que interactúan entre sí:

- **Personal:** Gestión de empleados, roles organizacionales y estados laborales.
- **Grupos:** Organización de personal en turnos rotativos (A, B, C) y administrativos.
- **Producción:** El núcleo industrial. Maneja Órdenes de Producción, Bitácoras de Turno, Incidentes y Registros de Trabajo.
- **Calidad:** Control de muestras, parámetros nominales y trazabilidad de lotes.
- **Recursos:** Inventario y consumos de materiales durante el proceso productivo.
- **Bootstrap:** Proceso de inicialización única del sistema.
- **Auth:** Seguridad, login y gestión de permisos (RBAC).

---

## 🛠️ Servicios Transversales (Shared)

Componentes que brindan soporte a todos los dominios:

### 🔍 Auditoría (AuditService)
Registra cada cambio crítico en el sistema, indicando el autor, el valor anterior, el nuevo valor y el motivo del cambio. Esto garantiza la trazabilidad forense de las operaciones.

### 📜 Logging (Winston)
Implementa un sistema de logs estructurados en formato JSON.
- **Nivel Info/Debug:** Visibilidad del flujo de peticiones y rendimiento.
- **Nivel Error:** Captura de excepciones con stack trace detallado para diagnóstico rápido.
- **Almacenamiento:** Los logs se guardan en archivos locales (`logs/error.log` y `logs/combined.log`).

### 🛡️ Manejo de Errores Centralizado
El sistema utiliza clases de error especializadas (`ValidationError`, `NotFoundError`, `UnauthorizedError`) que se traducen automáticamente a códigos HTTP correctos (400, 404, 401) mediante un middleware global.

### 🚀 Seguridad y Optimización
- **Modo WAL (Write-Ahead Logging):** SQLite se configura para permitir múltiples lectores y un escritor concurrente, mejorando el rendimiento en entornos industriales.
- **Integridad Referencial:** Forzado de llaves foráneas (`PRAGMA foreign_keys = ON`) para prevenir datos huérfanos.
