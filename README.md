# PROD-SYS: Trazabilidad y Calidad Industrial

Sistema profesional de gestión de producción industrial construido con Node.js, Express y SQLite.

## Estructura del Proyecto

```
backend/
├── app.js            # Configuración de Express
├── server.js         # Entrada del servidor
├── config/           # Configuraciones (env, db, security)
├── database/         # SQLite y conexión
├── domains/          # Lógica de negocio por dominios
│   ├── auth/
│   ├── bootstrap/
│   ├── dashboard/
│   ├── grupos/
│   ├── personal/
│   ├── production/
│   ├── quality/
│   └── resources/
├── middlewares/      # Middlewares globales (auth, error, etc.)
├── shared/           # Código compartido transversal
│   ├── audit/
│   ├── auth/
│   ├── errors/
│   ├── logger/
│   ├── response/
│   └── security/
└── tests/            # Tests unitarios e integración
    ├── helpers/
    └── integration/
frontend/
├── index.html        # Dashboard principal
├── public/           # Activos estáticos y páginas HTML
│   ├── css/
│   ├── js/
│   └── [páginas HTML]
└── src/
    └── design-system/ # Sistema de diseño centralizado
```

## Requisitos Previos

- Node.js (v16 o superior)
- npm

## Instalación y Primera Corrida

1. **Configuración Automática:**
   Ejecuta el script de configuración para instalar dependencias y crear el archivo `.env`:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Inicio del Servidor:**
   ```bash
   npm start
   ```
   El servidor correrá en `http://localhost:3000`.

3. **Credenciales por Defecto:**
   - **Usuario:** `admin`
   - **Contraseña:** la definida en `ADMIN_PASSWORD` dentro de `.env` (por defecto `admin_password`).

## Arquitectura

El proyecto sigue una arquitectura por capas:
- **Routes:** Define los endpoints.
- **Controllers:** Maneja las peticiones HTTP.
- **Services:** Contiene la lógica de negocio.
- **Repositories:** Gestiona las consultas a la base de datos.
- **Validation:** Validación de esquemas con Zod.

## Seguridad

- Autenticación JWT.
- Protección de cabeceras con Helmet.
- Limitación de tasa de peticiones (Rate Limiting).
- Validación estricta de variables de entorno.
