
const sqlite3 = require('sqlite3').verbose();

const DB_SOURCE = "mfcalidad.sqlite";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
        console.log('Conectado a la base de datos SQLite.');
        db.serialize(() => {
            console.log("Creando tablas si no existen...");

            db.run(`CREATE TABLE IF NOT EXISTS orden_produccion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo_orden TEXT UNIQUE,
                fecha_creacion DATE
            );`);

            db.run(`CREATE TABLE IF NOT EXISTS PROCESO_TIPO (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                unidad_produccion TEXT,
                reporta_merma_kg BOOLEAN,
                activo BOOLEAN DEFAULT TRUE
            );`);

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
                fecha_hora DATETIME,
                linea_ejecucion_id INTEGER,
                FOREIGN KEY (linea_ejecucion_id) REFERENCES lineas_ejecucion(id)
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
                codigo_muestra TEXT UNIQUE,
                fecha_analisis DATE,
                lote_id INTEGER,
                FOREIGN KEY (lote_id) REFERENCES lotes(id)
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
            );`, (err) => {
                if (err) {
                    console.error("Error creando la última tabla:", err.message);
                } else {
                    console.log("Esquema de la base de datos verificado/creado con éxito.");
                }
            });
        });
    }
});

module.exports = db;
