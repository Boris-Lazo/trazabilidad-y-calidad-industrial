const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('backend/database/mfcalidad.sqlite');
const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS sistema_config (clave TEXT UNIQUE, valor TEXT)");
  db.run("INSERT OR REPLACE INTO sistema_config (clave, valor) VALUES ('estado_sistema', 'INICIALIZADO')");
});
db.close();
