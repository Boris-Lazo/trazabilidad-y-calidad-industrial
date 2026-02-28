# PROD-SYS: Gestión de Trazabilidad y Calidad Industrial

PROD-SYS es un sistema integral diseñado para el control, monitoreo y auditoría de procesos de producción industrial en tiempo real. Proporciona una plataforma robusta para la gestión de personal, órdenes de producción, control de calidad y registros operativos, asegurando la integridad de los datos y la trazabilidad completa del ciclo de vida industrial.

---

## 🚀 Guía de Inicio Rápido

### Requisitos Previos
- **Node.js**: Versión 16 o superior.
- **npm**: Gestor de paquetes incluido con Node.js.

### Instalación
1. **Configurar el Entorno:**
   Copia el archivo de ejemplo y completa las variables obligatorias:
   ```bash
   cp .env.example .env
   ```
   O usa el script de automatización que instala dependencias y genera configuraciones iniciales (incluyendo `JWT_SECRET` automático):
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Iniciar el Servidor:**
   ```bash
   npm start
   ```
   El sistema estará accesible en `http://localhost:3000`.

3. **Inicialización del Sistema (Bootstrap):**
   Al acceder por primera vez, el sistema solicitará la creación de un administrador real. Este proceso es único y establece las bases de seguridad del entorno.

---

## 📂 Documentación Detallada

Para comprender a fondo el funcionamiento y diseño de PROD-SYS, consulta las siguientes secciones:

1.  [**Arquitectura del Sistema**](docs/ARCHITECTURE.md): Diseño técnico, capas de software y organización de dominios.
2.  [**Lógica de Negocio Industrial**](docs/BUSINESS_LOGIC.md): Procesos de producción, turnos, rotaciones y reglas operativas.
3.  [**Guía de Desarrollo y Seguridad**](docs/DEVELOPMENT_GUIDE.md): Estándares de código, seguridad (JWT, CSP con Nonces, Helmet) y sistema de diseño frontend.
4.  [**Modelo de Datos**](docs/DATABASE_SCHEMA.md): Esquema de base de datos SQLite, integridad y migraciones.
5.  [**Manual de Usuario (No Técnico)**](docs/USER_MANUAL.md): Guía paso a paso para el uso diario del sistema sin tecnicismos.

---

## 🛠️ Tecnologías Principales

- **Backend:** Node.js, Express.
- **Base de Datos:** SQLite (con modo WAL para alto rendimiento).
- **Seguridad:** JWT (JSON Web Tokens), bcrypt, Helmet, Rate Limiting.
- **Validación:** Zod para esquemas de datos.
- **Logging:** Winston (Logs estructurados y rotativos).
- **Frontend:** Vanilla JS con un sistema de diseño industrial centralizado.

---

## ⚖️ Licencia
Este proyecto es propiedad privada para uso industrial. Todos los derechos reservados.
