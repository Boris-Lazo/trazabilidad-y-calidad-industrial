const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = '/home/boris/Documentos/MF-calidad/backend/database/mfcalidad.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('--- PERSONAS ---');
    db.all("SELECT * FROM personas WHERE codigo_interno = 'admin' OR email = 'admin@prodsys.com'", [], (err, rows) => {
        if (err) console.error(err);
        console.log(JSON.stringify(rows, null, 2));

        console.log('--- USUARIOS ---');
        db.all("SELECT * FROM usuarios WHERE username = 'admin'", [], (err, rows) => {
            if (err) console.error(err);
            console.log(JSON.stringify(rows, null, 2));
            db.close();
        });
    });
});
