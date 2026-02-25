// Gestión de conexión SQLite y creación de esquema enterprise-grade
const sqlite3 = require('sqlite3').verbose();
const { dbPath, adminPassword } = require('../config/database');
const { logger } = require('../shared/logger/logger');
const { NODE_ENV } = require('../config/env');
const bcrypt = require('bcrypt');
const DatabaseError = require('../shared/errors/DatabaseError');

const actualDbPath = NODE_ENV === 'test' ? ':memory:' : dbPath;

const db = new sqlite3.Database(actualDbPath, (err) => {
  if (err) {
    logger.error('Error al conectar con SQLite:', err.message);
    throw err;
  }
  logger.info(`Conectado a la base de datos SQLite [${actualDbPath}].`);

  // Optimización para concurrencia y seguridad
  db.serialize(() => {
    db.run("PRAGMA journal_mode = WAL;");
    db.run("PRAGMA synchronous = NORMAL;");
    db.run("PRAGMA foreign_keys = ON;");
    logger.info('SQLite optimizado: WAL mode, Synchronous NORMAL, Foreign Keys ON.');
  });
});

// Función para inicializar el esquema e índices
const initDB = () => {
  logger.info("Verificando/Creando esquema de base de datos...");

  // --- MIGRACIÓN DE ESQUEMA ROBUSTA ---
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='personas'", (err, row) => {
    if (row) {
      db.all("PRAGMA table_info(personas)", (err, columns) => {
        const hasTipoPersonal = columns.some(c => c.name === 'tipo_personal');
        const hasRolOrg = columns.some(c => c.name === 'rol_organizacional');

        if (hasTipoPersonal || !hasRolOrg) {
          logger.info("Migrando tabla personas para rediseño de dominio...");
          db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(`CREATE TABLE personas_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                codigo_interno TEXT UNIQUE NOT NULL,
                area_id INTEGER NOT NULL,
                email TEXT UNIQUE NOT NULL,
                telefono TEXT,
                fecha_ingreso DATE,
                estado_laboral TEXT CHECK(estado_laboral IN ('Activo', 'Inactivo', 'Baja')) DEFAULT 'Activo',
                rol_organizacional TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT,
                motivo_cambio TEXT,
                FOREIGN KEY (area_id) REFERENCES areas(id)
            )`);

            db.run(`INSERT INTO personas_new (
                id, nombre, apellido, codigo_interno, area_id, email, telefono,
                fecha_ingreso, estado_laboral, created_at, created_by, updated_at, updated_by, motivo_cambio
            ) SELECT
                id, nombre, apellido, codigo_interno, area_id, email, telefono,
                fecha_ingreso, estado_laboral, created_at, created_by, updated_at, updated_by, motivo_cambio
            FROM personas`);

            db.run("DROP TABLE personas");
            db.run("ALTER TABLE personas_new RENAME TO personas");

            db.run("COMMIT", (err) => {
              if (err) logger.error("Error al finalizar migración de personas:", err.message);
              else logger.info("Migración de personas completada con éxito.");
            });
          });
        }
      });
    }
  });

  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'", (err, row) => {
    if (row) {
      db.all("PRAGMA table_info(usuarios)", (err, columns) => {
        const hasPersonaId = columns.some(c => c.name === 'persona_id');
        const personaIdCol = columns.find(c => c.name === 'persona_id');
        const hasRolId = columns.some(c => c.name === 'rol_id');

        // Caso 1: Tabla muy antigua sin persona_id
        if (!hasPersonaId) {
          logger.info("Detectado esquema de usuarios antiguo. Renombrando a usuarios_legacy...");
          db.run("ALTER TABLE usuarios RENAME TO usuarios_legacy", (err) => {
            if (err) logger.error(`Error al renombrar tabla usuarios: ${err.message}`);
            runFullSchema();
          });
        }
        // Caso 2: Tabla tiene persona_id pero es NOT NULL o falta rol_id (Migración de dominio)
        else if ((personaIdCol && personaIdCol.notnull === 1) || !hasRolId) {
          logger.info("Migrando tabla usuarios para soportar nuevo dominio (persona_id NULL y rol_id)...");

          db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // 1. Crear tabla temporal con el esquema correcto
            db.run(`CREATE TABLE usuarios_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                persona_id INTEGER UNIQUE,
                rol_id INTEGER,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                password_last_changed_at DATETIME,
                intentos_fallidos INTEGER DEFAULT 0,
                bloqueado_at DATETIME,
                bloqueado_por INTEGER,
                estado_usuario TEXT CHECK(estado_usuario IN ('Activo', 'Suspendido', 'Bloqueado', 'Baja lógica')) DEFAULT 'Activo',
                must_change_password BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT,
                motivo_cambio TEXT,
                FOREIGN KEY (persona_id) REFERENCES personas(id),
                FOREIGN KEY (bloqueado_por) REFERENCES personas(id),
                FOREIGN KEY (rol_id) REFERENCES roles(id)
            )`);

            // 2. Copiar datos existentes
            db.run(`INSERT INTO usuarios_new (
                id, persona_id, username, password_hash, password_last_changed_at,
                intentos_fallidos, bloqueado_at, bloqueado_por, estado_usuario,
                must_change_password, created_at, created_by, updated_at, updated_by, motivo_cambio
            ) SELECT
                id, persona_id, username, password_hash, password_last_changed_at,
                intentos_fallidos, bloqueado_at, bloqueado_por, estado_usuario,
                must_change_password, created_at, created_by, updated_at, updated_by, motivo_cambio
            FROM usuarios`);

            // 3. Intercambiar tablas
            db.run("DROP TABLE usuarios");
            db.run("ALTER TABLE usuarios_new RENAME TO usuarios");

            db.run("COMMIT", (err) => {
              if (err) logger.error("Error al finalizar migración de usuarios:", err.message);
              else logger.info("Migración de usuarios completada con éxito.");
              migrateProcesoTipo();
            });
          });
        }
        else {
          migrateProcesoTipo();
        }
      });
    } else {
      migrateProcesoTipo();
    }
  });
};

const migrateProcesoTipo = () => {
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='PROCESO_TIPO'", (err, row) => {
    if (row) {
      logger.info("Migrando esquema: Eliminando PROCESO_TIPO y rediseñando referencias a contratos estáticos...");
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // 1. Migrar MAQUINAS
        db.run(`CREATE TABLE MAQUINAS_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE,
            proceso_id INTEGER,
            activo BOOLEAN DEFAULT 1
        )`);
        db.run(`INSERT INTO MAQUINAS_new (id, codigo, proceso_id, activo) SELECT id, codigo, proceso_tipo_id, activo FROM MAQUINAS`);
        db.run("DROP TABLE MAQUINAS");
        db.run("ALTER TABLE MAQUINAS_new RENAME TO MAQUINAS");

        // 2. Migrar lineas_ejecucion
        db.run(`CREATE TABLE lineas_ejecucion_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            estado TEXT CHECK(estado IN ('ACTIVA', 'PAUSADA', 'COMPLETADA', 'CANCELADA')) DEFAULT 'ACTIVA',
            orden_produccion_id INTEGER,
            proceso_id INTEGER,
            maquina_id INTEGER,
            fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_fin DATETIME,
            FOREIGN KEY (orden_produccion_id) REFERENCES orden_produccion(id),
            FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
        )`);
        db.run(`INSERT INTO lineas_ejecucion_new (id, estado, orden_produccion_id, proceso_id, maquina_id, fecha_inicio, fecha_fin)
                SELECT id, estado, orden_produccion_id, proceso_tipo_id, maquina_id, fecha_inicio, fecha_fin FROM lineas_ejecucion`);
        db.run("DROP TABLE lineas_ejecucion");
        db.run("ALTER TABLE lineas_ejecucion_new RENAME TO lineas_ejecucion");

        // 3. Migrar muestras
        db.run(`CREATE TABLE muestras_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_muestra TEXT,
            fecha_analisis DATE,
            lote_id INTEGER,
            bitacora_id INTEGER,
            proceso_id INTEGER,
            maquina_id INTEGER,
            resultado TEXT,
            valor REAL,
            parametro TEXT,
            valor_nominal REAL,
            usuario_modificacion TEXT,
            fecha_modificacion DATETIME,
            FOREIGN KEY (lote_id) REFERENCES lotes(id),
            FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id),
            FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
        )`);
        db.run(`INSERT INTO muestras_new (id, codigo_muestra, fecha_analisis, lote_id, bitacora_id, proceso_id, maquina_id, resultado, valor, parametro, valor_nominal, usuario_modificacion, fecha_modificacion)
                SELECT id, codigo_muestra, fecha_analisis, lote_id, bitacora_id, proceso_tipo_id, maquina_id, resultado, valor, parametro, valor_nominal, usuario_modificacion, fecha_modificacion FROM muestras`);
        db.run("DROP TABLE muestras");
        db.run("ALTER TABLE muestras_new RENAME TO muestras");

        // 4. Migrar bitacora_proceso_status
        db.run(`CREATE TABLE bitacora_proceso_status_new (
            bitacora_id INTEGER,
            proceso_id INTEGER,
            no_operativo BOOLEAN DEFAULT 0,
            motivo_no_operativo TEXT,
            PRIMARY KEY (bitacora_id, proceso_id),
            FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id)
        )`);
        db.run(`INSERT INTO bitacora_proceso_status_new SELECT bitacora_id, proceso_tipo_id, no_operativo, motivo_no_operativo FROM bitacora_proceso_status`);
        db.run("DROP TABLE bitacora_proceso_status");
        db.run("ALTER TABLE bitacora_proceso_status_new RENAME TO bitacora_proceso_status");

        // 5. Migrar asignaciones_operativas
        db.run(`CREATE TABLE asignaciones_operativas_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id INTEGER NOT NULL,
            proceso_id INTEGER NOT NULL,
            maquina_id INTEGER,
            fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_fin DATETIME,
            turno TEXT,
            permanente BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT,
            motivo_cambio TEXT,
            FOREIGN KEY (persona_id) REFERENCES personas(id),
            FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
        )`);
        db.run(`INSERT INTO asignaciones_operativas_new (id, persona_id, proceso_id, maquina_id, fecha_inicio, fecha_fin, turno, permanente, created_at, created_by, updated_at, updated_by, motivo_cambio)
                SELECT id, persona_id, proceso_tipo_id, maquina_id, fecha_inicio, fecha_fin, turno, permanente, created_at, created_by, updated_at, updated_by, motivo_cambio FROM asignaciones_operativas`);
        db.run("DROP TABLE asignaciones_operativas");
        db.run("ALTER TABLE asignaciones_operativas_new RENAME TO asignaciones_operativas");

        // 6. Migrar ausencias
        db.run(`CREATE TABLE ausencias_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            fecha DATE NOT NULL,
            turno TEXT,
            proceso_id INTEGER,
            maquina_id INTEGER,
            motivo TEXT,
            comentario TEXT,
            registrado_por INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT,
            motivo_cambio TEXT,
            FOREIGN KEY (persona_id) REFERENCES personas(id),
            FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id),
            FOREIGN KEY (registrado_por) REFERENCES personas(id)
        )`);
        db.run(`INSERT INTO ausencias_new (id, persona_id, tipo, fecha, turno, proceso_id, maquina_id, motivo, comentario, registrado_por, created_at, created_by, updated_at, updated_by, motivo_cambio)
                SELECT id, persona_id, tipo, fecha, turno, proceso_tipo_id, maquina_id, motivo, comentario, registrado_por, created_at, created_by, updated_at, updated_by, motivo_cambio FROM ausencias`);
        db.run("DROP TABLE ausencias");
        db.run("ALTER TABLE ausencias_new RENAME TO ausencias");

        // 7. Eliminar tablas obsoletas
        db.run("DROP TABLE PROCESO_TIPO");
        db.run("DROP TABLE IF EXISTS PARAMETRO_DEFINICION");
        db.run("DROP TABLE IF EXISTS UNIDAD_MEDIDA");

        db.run("COMMIT", (err) => {
          if (err) logger.error("Error al finalizar migración de procesos:", err.message);
          else logger.info("Migración de procesos a modelo estático completada.");
          runFullSchema();
        });
      });
    } else {
      runFullSchema();
    }
  });
};

const runFullSchema = () => {
  db.serialize(() => {
    // Tablas principales
    db.run(`CREATE TABLE IF NOT EXISTS bitacora_turno (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        turno TEXT,
        fecha_operativa DATE,
        inspector TEXT,
        estado TEXT CHECK(estado IN ('ABIERTA', 'REVISION', 'CERRADA')) DEFAULT 'ABIERTA',
        fuera_de_horario BOOLEAN DEFAULT 0,
        fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_cierre DATETIME
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS orden_produccion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_orden TEXT UNIQUE,
        producto TEXT,
        cantidad_objetivo REAL,
        unidad TEXT,
        fecha_planificada DATE,
        prioridad TEXT,
        observaciones TEXT,
        estado TEXT CHECK(estado IN ('Creada', 'Liberada', 'En producción', 'Pausada', 'Cerrada', 'Cancelada')) DEFAULT 'Creada',
        fecha_creacion DATE,
        especificaciones TEXT,
        motivo_cierre TEXT
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS MAQUINAS (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        proceso_id INTEGER,
        activo BOOLEAN DEFAULT 1
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS PARO_TIPO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE,
        activo BOOLEAN DEFAULT 1
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS lineas_ejecucion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estado TEXT CHECK(estado IN ('ACTIVA', 'PAUSADA', 'COMPLETADA', 'CANCELADA')) DEFAULT 'ACTIVA',
        orden_produccion_id INTEGER,
        proceso_id INTEGER,
        maquina_id INTEGER,
        fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_fin DATETIME,
        FOREIGN KEY (orden_produccion_id) REFERENCES orden_produccion(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS incidentes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        descripcion TEXT,
        severidad TEXT,
        estado TEXT DEFAULT 'abierto',
        linea_ejecucion_id INTEGER,
        maquina_id INTEGER,
        bitacora_id INTEGER,
        fecha_creacion DATETIME,
        fecha_cierre DATETIME,
        accion_correctiva TEXT,
        FOREIGN KEY (linea_ejecucion_id) REFERENCES lineas_ejecucion(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS registros_trabajo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cantidad_producida REAL,
        merma_kg REAL DEFAULT 0,
        parametros TEXT,
        observaciones TEXT,
        fecha_hora DATETIME,
        linea_ejecucion_id INTEGER,
        bitacora_id INTEGER,
        maquina_id INTEGER,
        estado TEXT DEFAULT 'completado',
        usuario_modificacion TEXT,
        fecha_modificacion DATETIME,
        FOREIGN KEY (linea_ejecucion_id) REFERENCES lineas_ejecucion(id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS lotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_lote TEXT UNIQUE,
        fecha_produccion DATE,
        orden_produccion_id INTEGER,
        FOREIGN KEY (orden_produccion_id) REFERENCES orden_produccion(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS muestras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_muestra TEXT,
        fecha_analisis DATE,
        lote_id INTEGER,
        bitacora_id INTEGER,
        proceso_id INTEGER,
        maquina_id INTEGER,
        resultado TEXT,
        valor REAL,
        parametro TEXT,
        valor_nominal REAL,
        usuario_modificacion TEXT,
        fecha_modificacion DATETIME,
        FOREIGN KEY (lote_id) REFERENCES lotes(id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS bitacora_maquina_status (
        bitacora_id INTEGER,
        maquina_id INTEGER,
        estado TEXT DEFAULT 'Sin datos',
        observacion_advertencia TEXT,
        PRIMARY KEY (bitacora_id, maquina_id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS calidad_telares_visual (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bitacora_id INTEGER,
        maquina_id INTEGER,
        orden_id INTEGER,
        rollo_numero INTEGER,
        tipo_defecto TEXT,
        observacion TEXT,
        usuario_modificacion TEXT,
        fecha_modificacion DATETIME,
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id),
        FOREIGN KEY (orden_id) REFERENCES orden_produccion(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS RECURSO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        nombre TEXT,
        descripcion TEXT,
        tipo TEXT,
        unidad_medida TEXT
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS CONSUMO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cantidad_consumida REAL,
        timestamp_consumo DATETIME,
        registro_trabajo_id INTEGER,
        recurso_id INTEGER,
        FOREIGN KEY (registro_trabajo_id) REFERENCES registros_trabajo(id),
        FOREIGN KEY (recurso_id) REFERENCES RECURSO(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS bitacora_proceso_status (
        bitacora_id INTEGER,
        proceso_id INTEGER,
        no_operativo BOOLEAN DEFAULT 0,
        motivo_no_operativo TEXT,
        PRIMARY KEY (bitacora_id, proceso_id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id)
    );`);

    // --- MÓDULO DE PERSONAL Y USUARIOS ---
    db.run(`CREATE TABLE IF NOT EXISTS areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        codigo_interno TEXT UNIQUE NOT NULL,
        area_id INTEGER NOT NULL,
        email TEXT UNIQUE NOT NULL,
        telefono TEXT,
        fecha_ingreso DATE,
        estado_laboral TEXT CHECK(estado_laboral IN ('Activo', 'Inactivo', 'Baja')) DEFAULT 'Activo',
        rol_organizacional TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        motivo_cambio TEXT,
        FOREIGN KEY (area_id) REFERENCES areas(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER UNIQUE,
        rol_id INTEGER,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_last_changed_at DATETIME,
        intentos_fallidos INTEGER DEFAULT 0,
        bloqueado_at DATETIME,
        bloqueado_por INTEGER,
        estado_usuario TEXT CHECK(estado_usuario IN ('Activo', 'Suspendido', 'Bloqueado', 'Baja lógica')) DEFAULT 'Activo',
        must_change_password BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        motivo_cambio TEXT,
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (bloqueado_por) REFERENCES personas(id),
        FOREIGN KEY (rol_id) REFERENCES roles(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS grupos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        tipo TEXT CHECK(tipo IN ('operativo', 'administrativo')) NOT NULL,
        turno_actual TEXT,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS grupo_integrantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo_id INTEGER NOT NULL,
        persona_id INTEGER NOT NULL,
        fecha_desde DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_hasta DATETIME,
        motivo TEXT,
        asignado_por INTEGER,
        FOREIGN KEY (grupo_id) REFERENCES grupos(id),
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (asignado_por) REFERENCES personas(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS roles_operativos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        activo BOOLEAN DEFAULT 1
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS persona_roles_operativos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        rol_operativo_id INTEGER NOT NULL,
        fecha_desde DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_hasta DATETIME,
        motivo TEXT,
        asignado_por INTEGER,
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (rol_operativo_id) REFERENCES roles_operativos(id),
        FOREIGN KEY (asignado_por) REFERENCES personas(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS persona_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        rol_id INTEGER NOT NULL,
        fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        asignado_por INTEGER,
        activo BOOLEAN DEFAULT 1,
        motivo_cambio TEXT,
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (rol_id) REFERENCES roles(id),
        FOREIGN KEY (asignado_por) REFERENCES personas(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS asignaciones_operativas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        proceso_id INTEGER NOT NULL,
        maquina_id INTEGER,
        fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_fin DATETIME,
        turno TEXT,
        permanente BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        motivo_cambio TEXT,
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS ausencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        fecha DATE NOT NULL,
        turno TEXT,
        proceso_id INTEGER,
        maquina_id INTEGER,
        motivo TEXT,
        comentario TEXT,
        registrado_por INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        motivo_cambio TEXT,
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id),
        FOREIGN KEY (registrado_por) REFERENCES personas(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        accion TEXT,
        entidad TEXT,
        entidad_id INTEGER,
        valor_anterior TEXT,
        valor_nuevo TEXT,
        motivo_cambio TEXT,
        categoria_motivo TEXT,
        fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS sistema_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT UNIQUE NOT NULL,
        valor TEXT NOT NULL
    );`);

    // Creación de índices críticos
    logger.info("Asegurando índices de base de datos...");
    db.run(`CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora_turno(fecha_operativa);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_orden_codigo ON orden_produccion(codigo_orden);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_lineas_orden ON lineas_ejecucion(orden_produccion_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_registros_bitacora ON registros_trabajo(bitacora_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_muestras_lote ON muestras(lote_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_muestras_bitacora ON muestras(bitacora_id);`);

    // --- SEMILLAS ---
    // Las semillas deben ejecutarse en orden para respetar dependencias
    db.get("SELECT COUNT(*) as count FROM grupos", (err, row) => {
      if (err) return logger.error('Error al verificar grupos:', err.message);
      if (row && row.count === 0) {
        const defaultGroups = [
          ['Grupo A', 'operativo', 'T1'],
          ['Grupo B', 'operativo', 'T2'],
          ['Grupo C', 'operativo', 'T3'],
          ['Administrativo', 'administrativo', 'T4']
        ];
        const stmt = db.prepare("INSERT INTO grupos (nombre, tipo, turno_actual) VALUES (?, ?, ?)");
        defaultGroups.forEach(g => stmt.run(g));
        stmt.finalize(() => logger.info('Grupos inicializados.'));
      }
    });

    db.get("SELECT COUNT(*) as count FROM roles_operativos", (err, row) => {
      if (err) return logger.error('Error al verificar roles operativos:', err.message);
      if (row && row.count === 0) {
        const defaultOpsRoles = ['Tejedor', 'Urdidor', 'Mecánico', 'Inspector de Calidad', 'Auxiliar', 'Supervisor de Planta'];
        const stmt = db.prepare("INSERT INTO roles_operativos (nombre) VALUES (?)");
        defaultOpsRoles.forEach(r => stmt.run(r));
        stmt.finalize(() => logger.info('Roles operativos inicializados.'));
      }
    });

    db.get("SELECT COUNT(*) as count FROM roles", (err, row) => {
      if (err) return logger.error('Error al verificar roles:', err.message);

      if (row && row.count === 0) {
        const defaultRoles = ['Inspector', 'Supervisor', 'Jefe de Operaciones', 'Gerencia', 'Operario', 'Administrador'];
        const stmt = db.prepare("INSERT INTO roles (nombre) VALUES (?)");
        defaultRoles.forEach(r => stmt.run(r));
        stmt.finalize(() => {
          logger.info('Roles inicializados.');
          seedAreasAndAdmin();
        });
      } else {
        seedAreasAndAdmin();
      }
    });

    const seedAreasAndAdmin = () => {
      db.get("SELECT COUNT(*) as count FROM areas", (err, row) => {
        if (err) return logger.error('Error al verificar áreas:', err.message);

        if (row && row.count === 0) {
          const defaultAreas = ['Producción', 'Departamento de Calidad', 'Mantenimiento', 'Administración'];
          const stmt = db.prepare("INSERT INTO areas (nombre) VALUES (?)");
          defaultAreas.forEach(a => stmt.run(a));
          stmt.finalize(() => {
            logger.info('Áreas inicializadas.');
            seedSystemConfig();
          });
        } else {
          // Ajuste dinámico de áreas para alinearse con el nuevo dominio
          db.serialize(() => {
            db.run("UPDATE areas SET nombre = 'Departamento de Calidad' WHERE nombre = 'Calidad'");
            db.run("DELETE FROM areas WHERE nombre = 'Sistemas'");
            const requiredAreas = ['Producción', 'Departamento de Calidad', 'Mantenimiento', 'Administración'];
            const stmt = db.prepare("INSERT OR IGNORE INTO areas (nombre) VALUES (?)");
            requiredAreas.forEach(a => stmt.run(a));
            stmt.finalize();
            seedSystemConfig();
          });
        }
      });
    };

    const seedSystemConfig = () => {
      db.get("SELECT COUNT(*) as count FROM sistema_config WHERE clave = 'estado_sistema'", (err, row) => {
        if (err) return logger.error('Error al verificar sistema_config:', err.message);

        if (row && row.count === 0) {
          db.run("INSERT INTO sistema_config (clave, valor) VALUES ('estado_sistema', 'NO_INICIALIZADO')", (err) => {
            if (err) logger.error('Error al inicializar estado_sistema:', err.message);
            else logger.info('Estado del sistema inicializado como NO_INICIALIZADO.');
          });
        }
      });
    };

    // Semilla de procesos eliminada (ahora en contratos estáticos)

    // Semilla de Máquinas (Telares)
    db.get("SELECT COUNT(*) as count FROM MAQUINAS WHERE proceso_id = 2", (err, row) => {
        if (row && row.count === 0) {
            const stmtM = db.prepare("INSERT INTO MAQUINAS (codigo, proceso_id) VALUES (?, 2)");
            for (let i = 1; i <= 13; i++) {
                stmtM.run([`T-${i.toString().padStart(2, '0')}`]);
            }
            stmtM.finalize();
            logger.info('Máquinas de Telares inicializadas.');
        }
    });

    // Semilla de Tipos de Paro
    db.get("SELECT COUNT(*) as count FROM PARO_TIPO", (err, row) => {
        if (row && row.count === 0) {
            const paros = ['Mecánico', 'Eléctrico', 'Operativo', 'Calidad', 'Falta de material', 'Cambio de orden', 'Limpieza', 'Mantenimiento'];
            const stmtP = db.prepare("INSERT INTO PARO_TIPO (nombre) VALUES (?)");
            paros.forEach(p => stmtP.run(p));
            stmtP.finalize();
            logger.info('Tipos de paro inicializados.');
        }
    });

    // Migración manual de columnas si las tablas ya existen
    const columnsToAdd = [
      { table: 'lineas_ejecucion', column: 'maquina_id', type: 'INTEGER' },
      { table: 'incidentes', column: 'maquina_id', type: 'INTEGER' },
      { table: 'incidentes', column: 'bitacora_id', type: 'INTEGER' },
      { table: 'registros_trabajo', column: 'maquina_id', type: 'INTEGER' },
      { table: 'registros_trabajo', column: 'usuario_modificacion', type: 'TEXT' },
      { table: 'registros_trabajo', column: 'fecha_modificacion', type: 'DATETIME' },
      { table: 'muestras', column: 'maquina_id', type: 'INTEGER' },
      { table: 'muestras', column: 'valor_nominal', type: 'REAL' },
      { table: 'muestras', column: 'usuario_modificacion', type: 'TEXT' },
      { table: 'muestras', column: 'fecha_modificacion', type: 'DATETIME' },
      { table: 'calidad_telares_visual', column: 'usuario_modificacion', type: 'TEXT' },
      { table: 'calidad_telares_visual', column: 'fecha_modificacion', type: 'DATETIME' },
      { table: 'orden_produccion', column: 'especificaciones', type: 'TEXT' },
      { table: 'orden_produccion', column: 'motivo_cierre', type: 'TEXT' },
      { table: 'lineas_ejecucion', column: 'fecha_inicio', type: 'DATETIME' },
      { table: 'lineas_ejecucion', column: 'fecha_fin', type: 'DATETIME' },
      { table: 'auditoria', column: 'valor_anterior', type: 'TEXT' },
      { table: 'auditoria', column: 'valor_nuevo', type: 'TEXT' },
      { table: 'auditoria', column: 'motivo_cambio', type: 'TEXT' },
      { table: 'auditoria', column: 'categoria_motivo', type: 'TEXT' },
      { table: 'usuarios', column: 'rol_id', type: 'INTEGER' }
    ];

    // Migración de roles desde persona_roles a usuarios (Idempotente)
    db.run(`
      UPDATE usuarios
      SET rol_id = (
        SELECT rol_id FROM persona_roles
        WHERE persona_roles.persona_id = usuarios.persona_id
        AND persona_roles.activo = 1
        LIMIT 1
      )
      WHERE rol_id IS NULL
      AND persona_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM persona_roles WHERE persona_id = usuarios.persona_id)
    `, (err) => {
        if (err) logger.error('Error al migrar roles a usuarios:', err.message);
    });

    columnsToAdd.forEach(item => {
      db.run(`ALTER TABLE ${item.table} ADD COLUMN ${item.column} ${item.type}`, (err) => {
        // Ignoramos error si la columna ya existe
      });
    });

    logger.info("Esquema e índices verificados con éxito.");
  });
};

/**
 * Wrapper para ejecutar consultas SQL con manejo de errores centralizado
 */
const handleDBError = (err, sql) => {
  logger.error(`Error en base de datos: ${err.message}`, { sql, stack: err.stack });
  return new DatabaseError('Error al procesar la solicitud de datos');
};

module.exports = {
  db,
  initDB,
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(handleDBError(err, sql));
        else resolve(rows);
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(handleDBError(err, sql));
        else resolve(row);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(handleDBError(err, sql));
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  beginTransaction: () => {
    return new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(handleDBError(err, 'BEGIN TRANSACTION'));
        else resolve();
      });
    });
  },
  commit: () => {
    return new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(handleDBError(err, 'COMMIT'));
        else resolve();
      });
    });
  },
  rollback: () => {
    return new Promise((resolve, reject) => {
      db.run('ROLLBACK', (err) => {
        if (err) reject(handleDBError(err, 'ROLLBACK'));
        else resolve();
      });
    });
  },
  withTransaction: async (fn) => {
    const sqlite = module.exports; // Referencia a los métodos expuestos
    await sqlite.beginTransaction();
    try {
      const result = await fn();
      await sqlite.commit();
      return result;
    } catch (err) {
      await sqlite.rollback();
      throw err;
    }
  }
};
