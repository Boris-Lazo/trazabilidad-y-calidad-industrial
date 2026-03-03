const sqlite3 = require('sqlite3').verbose();
const dbPath = '/home/boris/Documentos/MF-calidad/backend/database/mfcalidad.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, rows) => {
        if (err) console.error(err);
        console.log('Tables in database:', rows.map(r => r.name).join(', '));
        db.close();
    });
});
