# Guía de Desarrollo y Seguridad: PROD-SYS

Esta guía establece los estándares técnicos y principios de seguridad que rigen el desarrollo de PROD-SYS.

---

## 🛠️ Estándares de Código

Para mantener la coherencia en el proyecto, seguimos estas reglas:

### 1. Convenciones de Nomenclatura
- **Archivos:** `kebab-case` para directorios y archivos de ruta (`personal.routes.js`).
- **Clases:** `PascalCase` (`PersonalService`).
- **Variables y Funciones:** `camelCase` (`getPersonalById`).
- **Constantes:** `UPPER_SNAKE_CASE` (`JWT_SECRET`).

### 2. Estructura de Capas Obligatoria
- **Nunca** accedas a un repositorio desde un controlador; usa siempre un servicio.
- **Nunca** pongas lógica de negocio en una ruta; úsala solo para definir el endpoint y middlewares.
- **Nunca** ejecutes SQL directamente en un servicio; usa métodos del repositorio.

### 3. Manejo de Errores
Lanza errores especializados en lugar de `new Error()`. El middleware global se encargará del resto:
```javascript
throw new ValidationError('El código de orden debe tener 7 dígitos');
```

---

## 🔒 Seguridad (Security-First)

PROD-SYS implementa múltiples capas de protección:

### 1. Autenticación JWT (JSON Web Tokens)
- Las sesiones no se guardan en el servidor (Stateless).
- Se utiliza el header `Authorization: Bearer <token>` para peticiones protegidas.
- Los tokens tienen una expiración limitada para reducir riesgos.

### 2. Protección de Cabeceras (Helmet)
Express está configurado con **Helmet** para prevenir ataques comunes como XSS (Cross-Site Scripting) y Clickjacking, forzando políticas de seguridad de contenido (CSP).

### 3. Control de Tasa (Rate Limiting)
Para prevenir ataques de fuerza bruta y denegación de servicio (DoS), las peticiones a la API están limitadas por IP (máximo 100 peticiones cada 15 minutos).

### 4. Cifrado de Contraseñas
Nunca se guardan contraseñas en texto plano. Se utiliza **bcrypt** con un factor de costo 10 para asegurar que, incluso en caso de una brecha de datos, las credenciales no sean descifrables.

---

## 🎨 Sistema de Diseño (Design System)

El frontend utiliza un **Sistema de Diseño Industrial** centralizado ubicado en `frontend/src/design-system/`.

### Características Principales:
- **Index.css:** Define la paleta de colores, tipografía (Inter/Roboto Mono) y componentes base (botones, tablas, tarjetas).
- **Index.js:** Implementa comportamientos transversales como el toggle de tema (Oscuro/Claro), notificaciones (Toasts) y estados de carga en botones.
- **Accesibilidad:** Diseñado para entornos industriales con alto contraste y elementos táctiles grandes.

---

## 🧪 Estrategia de Pruebas (Testing)

El sistema cuenta con un suite de pruebas automatizadas:
- **Unitarias:** Prueban la lógica de los servicios en aislamiento.
- **Integración:** Verifican el flujo completo desde la ruta hasta la base de datos (usando SQLite en memoria para mayor velocidad).
- **Ejecución:** `npm test` corre todo el suite.

---

## ⚙️ Configuración del Entorno (.env)

El archivo `.env` es mandatorio para el funcionamiento del servidor:
- `PORT`: Puerto de escucha (ej. 3000).
- `JWT_SECRET`: Llave secreta para firmar tokens (mínimo 32 caracteres).
- `ADMIN_PASSWORD`: Contraseña para el usuario administrador por defecto (solo se usa si el sistema no está inicializado).
- `NODE_ENV`: 'development', 'test' o 'production'.
