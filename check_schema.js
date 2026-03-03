const sqlite3 = require('sqlite3').verbose();
const dbPath = '/home/boris/Documentos/MF-calidad/backend/database/mfcalidad.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT sql FROM sqlite_master WHERE type='table' AND (name='usuarios' OR name='personas')", [], (err, rows) => {
        if (err) console.error(err);
        rows.forEach(row => console.log(row.sql));
        db.close();
    });
});
