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

  // --- MIGRACIÓN DE ESQUEMA LEGACY ---
  // Detectar si la tabla usuarios es la versión antigua (sin persona_id)
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'", (err, row) => {
    if (row) {
      db.all("PRAGMA table_info(usuarios)", (err, columns) => {
        if (columns && columns.length > 0) {
          const hasPersonaId = columns.some(c => c.name === 'persona_id');
          if (!hasPersonaId) {
            logger.info("Detectado esquema de usuarios antiguo. Renombrando a usuarios_legacy...");
            db.run("ALTER TABLE usuarios RENAME TO usuarios_legacy", (err) => {
              if (err) {
                logger.error(`Error al renombrar tabla usuarios: ${err.message}`);
              }
              runFullSchema();
            });
          } else {
            runFullSchema();
          }
        } else {
          runFullSchema();
        }
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

    db.run(`CREATE TABLE IF NOT EXISTS PROCESO_TIPO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        unidad_produccion TEXT,
        reporta_merma_kg BOOLEAN,
        activo BOOLEAN DEFAULT TRUE
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS MAQUINAS (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        proceso_tipo_id INTEGER,
        activo BOOLEAN DEFAULT 1,
        FOREIGN KEY (proceso_tipo_id) REFERENCES PROCESO_TIPO(id)
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
        proceso_tipo_id INTEGER,
        maquina_id INTEGER,
        fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_fin DATETIME,
        FOREIGN KEY (orden_produccion_id) REFERENCES orden_produccion(id),
        FOREIGN KEY (proceso_tipo_id) REFERENCES PROCESO_TIPO(id),
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
        proceso_tipo_id INTEGER,
        maquina_id INTEGER,
        resultado TEXT,
        valor REAL,
        parametro TEXT,
        valor_nominal REAL,
        usuario_modificacion TEXT,
        fecha_modificacion DATETIME,
        FOREIGN KEY (lote_id) REFERENCES lotes(id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id),
        FOREIGN KEY (proceso_tipo_id) REFERENCES PROCESO_TIPO(id),
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
        proceso_tipo_id INTEGER,
        no_operativo BOOLEAN DEFAULT 0,
        motivo_no_operativo TEXT,
        PRIMARY KEY (bitacora_id, proceso_tipo_id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id),
        FOREIGN KEY (proceso_tipo_id) REFERENCES PROCESO_TIPO(id)
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
        tipo_personal TEXT CHECK(tipo_personal IN ('operativo', 'administrativo')) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        motivo_cambio TEXT,
        FOREIGN KEY (area_id) REFERENCES areas(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER UNIQUE NOT NULL,
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
        FOREIGN KEY (bloqueado_por) REFERENCES personas(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
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
        proceso_tipo_id INTEGER NOT NULL,
        maquina_id INTEGER,
        fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_fin DATETIME,
        turno TEXT,
        permanente BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (proceso_tipo_id) REFERENCES PROCESO_TIPO(id),
        FOREIGN KEY (maquina_id) REFERENCES MAQUINAS(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS ausencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        fecha DATE NOT NULL,
        turno TEXT,
        proceso_tipo_id INTEGER,
        maquina_id INTEGER,
        motivo TEXT,
        comentario TEXT,
        registrado_por INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        FOREIGN KEY (persona_id) REFERENCES personas(id),
        FOREIGN KEY (proceso_tipo_id) REFERENCES PROCESO_TIPO(id),
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
        fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
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

    // Semillas de Personal y Roles
    db.get("SELECT COUNT(*) as count FROM roles", (err, row) => {
      if (err) {
        logger.error('Error al verificar roles:', err.message);
      } else if (row && row.count === 0) {
        const defaultRoles = ['Inspector', 'Supervisor', 'Jefe de Operaciones', 'Gerencia', 'Operario', 'Administrador'];
        const stmt = db.prepare("INSERT INTO roles (nombre) VALUES (?)");
        defaultRoles.forEach(r => stmt.run(r));
        stmt.finalize();
        logger.info('Roles inicializados.');
      }
    });

    db.get("SELECT COUNT(*) as count FROM areas", (err, row) => {
      if (err) {
        logger.error('Error al verificar áreas:', err.message);
      } else if (row && row.count === 0) {
        const defaultAreas = ['Producción', 'Calidad', 'Mantenimiento', 'Sistemas', 'Administración'];
        const stmt = db.prepare("INSERT INTO areas (nombre) VALUES (?)");
        defaultAreas.forEach(a => stmt.run(a));
        stmt.finalize();
        logger.info('Áreas inicializadas.');
      }
    });

    // Semilla de administrador inicial (Nuevo Modelo)
    db.get("SELECT COUNT(*) as count FROM personas WHERE codigo_interno = 'admin'", (err, row) => {
      if (err) {
        logger.error('Error al verificar persona admin:', err.message);
      } else if (row && row.count === 0) {
        db.serialize(() => {
          const hashedPassword = bcrypt.hashSync(adminPassword, 10);

          // 1. Obtener ID de área 'Sistemas'
          db.get("SELECT id FROM areas WHERE nombre = 'Sistemas'", (err, area) => {
            const areaId = area ? area.id : 1;

            // 2. Insertar Persona
            db.run("INSERT INTO personas (nombre, apellido, codigo_interno, area_id, email, tipo_personal, created_by) VALUES ('Admin', 'Sistema', 'admin', ?, 'admin@prodsys.com', 'administrativo', 'SYSTEM')", [areaId], function(err) {
              if (err) {
                logger.error('Error al insertar persona admin:', err.message);
                return;
              }
              const personaId = this.lastID;

              // 3. Insertar Usuario
              db.run("INSERT INTO usuarios (persona_id, username, password_hash, must_change_password, created_by) VALUES (?, 'admin', ?, 0, 'SYSTEM')", [personaId, hashedPassword], (err) => {
                if (err) logger.error('Error al insertar usuario admin:', err.message);
                else logger.info('Usuario administrador inicial creado con éxito.');
              });

              // 4. Asignar Rol Administrador
              db.get("SELECT id FROM roles WHERE nombre = 'Administrador'", (err, rol) => {
                if (rol) {
                  db.run("INSERT INTO persona_roles (persona_id, rol_id, asignado_por) VALUES (?, ?, ?)", [personaId, rol.id, personaId]);
                }
              });
            });
          });
        });
      }
    });

    // Semilla de procesos por defecto
    db.get("SELECT COUNT(*) as count FROM PROCESO_TIPO", (err, row) => {
      if (err) {
        logger.error('Error al verificar tipos de proceso:', err.message);
      } else if (row && row.count === 0) {
        const defaultProcesses = [
          ['Extrusor PP', 'kg', 1],
          ['Telares', 'm', 1],
          ['Laminado', 'm', 1],
          ['Imprenta', 'm', 1],
          ['Conversión de sacos', 'unid', 1],
          ['Extrusión PE', 'kg', 1],
          ['Conversión de liner', 'unid', 1],
          ['Peletizado', 'kg', 1],
          ['Conversión de sacos vestidos', 'unid', 1]
        ];
        const stmt = db.prepare("INSERT INTO PROCESO_TIPO (nombre, unidad_produccion, reporta_merma_kg) VALUES (?, ?, ?)");
        defaultProcesses.forEach(p => {
          stmt.run(p, (err) => {
            if (err) logger.error(`Error al insertar proceso ${p[0]}:`, err.message);
          });
        });
        stmt.finalize();
        logger.info('Procesos por defecto inicializados.');

        // Semilla de Máquinas (Telares)
        db.get("SELECT id FROM PROCESO_TIPO WHERE nombre = 'Telares'", (err, row) => {
          if (row) {
            const telaresId = row.id;
            const stmtM = db.prepare("INSERT INTO MAQUINAS (codigo, proceso_tipo_id) VALUES (?, ?)");
            for (let i = 1; i <= 13; i++) {
              stmtM.run([`T-${i.toString().padStart(2, '0')}`, telaresId]);
            }
            stmtM.finalize();
            logger.info('Máquinas de Telares inicializadas.');
          }
        });

        // Semilla de Tipos de Paro
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
      { table: 'auditoria', column: 'motivo_cambio', type: 'TEXT' }
    ];

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
