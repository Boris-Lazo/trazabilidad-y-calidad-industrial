// Gestión de conexión SQLite y creación de esquema
const sqlite3 = require('sqlite3').verbose();
const { dbPath } = require('../config/database');
const { ADMIN_PASSWORD } = require('../config/env');
const logger = require('../shared/logger/logger');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error al conectar con SQLite:', err.message);
    throw err;
  }
  logger.info('Conectado a la base de datos SQLite.');
});

// Función para inicializar el esquema
const initDB = () => {
  db.serialize(() => {
    logger.info("Verificando/Creando tablas...");

    db.run(`CREATE TABLE IF NOT EXISTS bitacora_turno (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        turno TEXT,
        fecha_operativa DATE,
        inspector TEXT,
        estado TEXT DEFAULT 'EN CURSO',
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
        estado TEXT DEFAULT 'abierta',
        fecha_creacion DATE
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS incidentes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        descripcion TEXT,
        severidad TEXT,
        estado TEXT DEFAULT 'abierto',
        linea_ejecucion_id INTEGER,
        fecha_creacion DATETIME,
        fecha_cierre DATETIME,
        accion_correctiva TEXT,
        FOREIGN KEY (linea_ejecucion_id) REFERENCES lineas_ejecucion(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        accion TEXT,
        entidad TEXT,
        entidad_id INTEGER,
        detalles TEXT,
        fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        rol TEXT,
        nombre TEXT
    );`, () => {
      db.get("SELECT COUNT(*) as count FROM usuarios WHERE username = 'admin'", (err, row) => {
        if (!err && row && row.count === 0) {
          const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
          db.run("INSERT INTO usuarios (username, password, rol, nombre) VALUES ('admin', ?, 'ADMIN', 'Administrador Sistema')", [hashedPassword]);
        }
      });
    });

    db.run(`CREATE TABLE IF NOT EXISTS PROCESO_TIPO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        unidad_produccion TEXT,
        reporta_merma_kg BOOLEAN,
        activo BOOLEAN DEFAULT TRUE
    );`, () => {
      db.get("SELECT COUNT(*) as count FROM PROCESO_TIPO", (err, row) => {
        if (!err && row && row.count === 0) {
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
          defaultProcesses.forEach(p => stmt.run(p));
          stmt.finalize();
        }
      });
    });

    db.run(`CREATE TABLE IF NOT EXISTS lineas_ejecucion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estado TEXT,
        orden_produccion_id INTEGER,
        proceso_tipo_id INTEGER,
        FOREIGN KEY (orden_produccion_id) REFERENCES orden_produccion(id),
        FOREIGN KEY (proceso_tipo_id) REFERENCES PROCESO_TIPO(id)
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
        estado TEXT DEFAULT 'completado',
        FOREIGN KEY (linea_ejecucion_id) REFERENCES lineas_ejecucion(id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id)
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
        resultado TEXT,
        valor REAL,
        parametro TEXT,
        FOREIGN KEY (lote_id) REFERENCES lotes(id),
        FOREIGN KEY (bitacora_id) REFERENCES bitacora_turno(id),
        FOREIGN KEY (proceso_tipo_id) REFERENCES PROCESO_TIPO(id)
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS RECURSO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        nombre TEXT,
        descripcion TEXT,
        tipo TEXT,
        unidad_medida TEXT
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

    db.run(`CREATE TABLE IF NOT EXISTS CONSUMO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cantidad_consumida REAL,
        timestamp_consumo DATETIME,
        registro_trabajo_id INTEGER,
        recurso_id INTEGER,
        FOREIGN KEY (registro_trabajo_id) REFERENCES registros_trabajo(id),
        FOREIGN KEY (recurso_id) REFERENCES RECURSO(id)
    );`, (err) => {
      if (err) {
        logger.error("Error al crear tablas:", err.message);
      } else {
        logger.info("Esquema de base de datos verificado con éxito.");
      }
    });
  });
};

module.exports = {
  db,
  initDB,
  // Helper para promesas
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};
