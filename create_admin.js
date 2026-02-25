const sqlite = require('./backend/database/sqlite');
const bcrypt = require('bcrypt');

async function createAdmin() {
    try {
        sqlite.initDB();
        await new Promise(resolve => setTimeout(resolve, 1000));

        const passwordHash = await bcrypt.hash('admin123', 10);

        await sqlite.run("INSERT INTO personas (nombre, apellido, codigo_interno, area_id, email, rol_organizacional) VALUES ('Admin', 'Root', 'ROOT001', 4, 'admin@prod-sys.com', 'Jefe de Operaciones')");
        const personaId = (await sqlite.get("SELECT last_insert_rowid() as id")).id;

        await sqlite.run("INSERT INTO usuarios (persona_id, rol_id, username, password_hash, estado_usuario, must_change_password) VALUES (?, 6, 'admin', ?, 'Activo', 0)", [personaId, passwordHash]);

        console.log('Admin user created: admin / admin123');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createAdmin();
