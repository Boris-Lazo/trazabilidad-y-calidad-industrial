---

# Guía de Desarrollo y Seguridad: PROD-SYS

Esta guía establece los estándares técnicos y principios de
seguridad que rigen el desarrollo de PROD-SYS.

---

## 🛠️ Estándares de Código

### 1. Convenciones de Nomenclatura
- **Archivos:** `kebab-case` para directorios y archivos de
  ruta (`personal.routes.js`).
- **Clases:** `PascalCase` (`PersonalService`).
- **Variables y Funciones:** `camelCase` (`getPersonalById`).
- **Constantes:** `UPPER_SNAKE_CASE` (`JWT_SECRET`).

### 2. Estructura de Capas Obligatoria
- **Nunca** accedas a un repositorio desde un controlador;
  usa siempre un servicio.
- **Nunca** pongas lógica de negocio en una ruta; úsala solo
  para definir el endpoint y middlewares.
- **Nunca** ejecutes SQL directamente en un servicio; usa
  métodos del repositorio.

### 3. Manejo de Errores
Lanza errores especializados en lugar de `new Error()`.
El middleware global se encargará del resto:
```javascript
throw new ValidationError('El código de orden debe tener 7 dígitos');
```

---

## 🔒 Seguridad (Security-First)

PROD-SYS implementa múltiples capas de protección:

### 1. Autenticación JWT
- Stateless: las sesiones no se guardan en el servidor.
- Header requerido: `Authorization: Bearer <token>`.
- Los tokens tienen expiración limitada.

### 2. Content Security Policy (CSP) con Nonces
PROD-SYS utiliza **nonces por request** para autorizar
scripts. En cada petición el servidor genera un nonce
aleatorio (`crypto.randomBytes(16)`) que se inyecta en
la política CSP. Esto elimina la necesidad de
`'unsafe-inline'` en `script-src`.

Directivas activas:
- `script-src`: `'self'`, `https://unpkg.com`, nonce dinámico.
- `script-src-attr`: nonce dinámico.
- `style-src`: `'self'`, `'unsafe-inline'` (estilos no son
  vector de XSS ejecutable), Google Fonts.
- `frame-ancestors`: `'none'` — previene clickjacking.
- `form-action`: `'self'` — previene form hijacking.

### 3. Protección de Cabeceras (Helmet)
Helmet gestiona el resto de cabeceras de seguridad HTTP:
X-Frame-Options, X-Content-Type-Options, HSTS, etc.

### 4. Control de Tasa (Rate Limiting)
Máximo 100 peticiones por IP cada 15 minutos en todas
las rutas `/api/`.

### 5. Cifrado de Contraseñas
bcrypt con factor de costo 10. Nunca se almacenan
contraseñas en texto plano ni se loguean.

---

## ⚙️ Configuración del Entorno

### Variables de entorno requeridas

| Variable | Obligatoria | Descripción |
|---|---|---|
| `JWT_SECRET` | ✅ Sí | Clave para firmar tokens JWT. Mínimo 32 chars. |
| `ADMIN_PASSWORD` | ✅ Sí | Contraseña del administrador inicial (bootstrap). |
| `PORT` | No | Puerto del servidor. Default: `3000`. |
| `NODE_ENV` | No | `development`, `test` o `production`. Default: `development`. |
| `DB_SOURCE` | No | Ruta al archivo SQLite. Default: `mfcalidad.sqlite`. |
| `LOG_LEVEL` | No | Nivel de log: `error`, `warn`, `info`, `debug`. Default: `info`. |

### Configuración inicial
```bash
# Copiar plantilla de variables
cp .env.example .env

# Editar .env y completar JWT_SECRET y ADMIN_PASSWORD
# O usar el script automatizado que genera JWT_SECRET:
./setup.sh
```

### Generar JWT_SECRET seguro
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🎨 Sistema de Diseño (Design System)

El frontend utiliza un Sistema de Diseño Industrial centralizado
en `frontend/src/design-system/`.

- **index.css:** Paleta de colores, tipografía y componentes base.
- **index.js:** Toggle de tema, notificaciones (Toasts) y estados
  de carga en botones.
- **Accesibilidad:** Alto contraste y elementos táctiles grandes
  para entornos industriales.

---

## 🧪 Estrategia de Pruebas

- **Unitarias:** Lógica de servicios en aislamiento.
- **Integración:** Flujo completo ruta → servicio → base de datos,
  usando SQLite en memoria.
- **Ejecución:** `npm test`

---

## 🏭 Contratos de Proceso

Cada proceso productivo tiene un contrato estático inmutable
en `backend/domains/production/contracts/`. Los contratos
definen parámetros de calidad, frecuencias de muestreo,
reglas de asignación de personal y trazabilidad de lotes.

**No modifiques un contrato sin actualizar esta guía y el
historial interno del contrato (`this.historial`).**

Procesos disponibles:
1. Extrusor PP (`ExtrusorPPContract`) — genera lotes de cinta PP
2. Telares (`TelarContract`) — consume lotes, produce tela en metros
3. Laminado (`LaminadoContract`)
4. Imprenta (`ImprentaContract`)
5. Conversión Sacos (`ConversionSacosContract`)
6. Extrusión PE (`ExtrusionPEContract`)
7. Conversión Liner PE (`ConversionLinerPEContract`)
8. Peletizado (`PeletizadoContract`)
9. Conversión Sacos Vestidos (`ConversionSacosVestidosContract`)

---

## 📦 Trazabilidad de Lotes

El sistema registra el ciclo de vida de los lotes de producción:

- **Generación:** El Extrusor PP genera un lote automáticamente
  al guardar producción. Código: `{codigo_orden}-{correlativo}`.
- **Estados:** `activo` → `pausado` ↔ `activo` → `cerrado`.
  El estado `cerrado` es terminal.
- **Consumo:** Cada telar declara qué lotes consume por turno.
  Un lote `cerrado` no puede ser declarado como consumido.
- **Trazabilidad:** `GET /api/lotes/:id/trazabilidad` retorna
  dónde se produjo y en qué telares se consumió un lote.
