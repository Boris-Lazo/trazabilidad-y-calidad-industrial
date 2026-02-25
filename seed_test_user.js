const sqlite = require('./backend/database/sqlite');
const bcrypt = require('bcrypt');

async function seed() {
    try {
        sqlite.initDB();
        // Wait a bit for initDB to finish (it's not fully async/await friendly in its current form)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const passwordHash = await bcrypt.hash('admin123', 10);

        // Clear previous test data if any
        await sqlite.run("DELETE FROM usuarios WHERE username IN ('admin', 'juan', 'maria')");
        await sqlite.run("DELETE FROM personas WHERE codigo_interno IN ('ADM001', 'AUX001', 'INS001')");

        await sqlite.run(`INSERT INTO personas (nombre, apellido, codigo_interno, area_id, email, tipo_personal)
                          VALUES ('Admin', 'Test', 'ADM001', 1, 'admin@test.com', 'administrativo')`);
        const personaId = (await sqlite.get('SELECT last_insert_rowid() as id')).id;

        const rolAdmin = await sqlite.get("SELECT id FROM roles WHERE nombre = 'Administrador'");

        await sqlite.run(`INSERT INTO usuarios (persona_id, rol_id, username, password_hash, estado_usuario, must_change_password)
                          VALUES (?, ?, 'admin', ?, 'Activo', 0)`, [personaId, rolAdmin.id, passwordHash]);

        // Add an Auxiliar to test highlighting
        await sqlite.run(`INSERT INTO personas (nombre, apellido, codigo_interno, area_id, email, tipo_personal)
                          VALUES ('Juan', 'Auxiliar', 'AUX001', 1, 'juan@test.com', 'operativo')`);
        const auxId = (await sqlite.get('SELECT last_insert_rowid() as id')).id;

        await sqlite.run(`INSERT INTO usuarios (persona_id, rol_id, username, password_hash, estado_usuario, must_change_password)
                          VALUES (?, (SELECT id FROM roles WHERE nombre = 'Operario'), 'juan', ?, 'Activo', 0)`, [auxId, passwordHash]);

        await sqlite.run(`INSERT INTO persona_roles_operativos (persona_id, rol_operativo_id, motivo)
                          VALUES (?, (SELECT id FROM roles_operativos WHERE nombre = 'Auxiliar'), 'Test')`, [auxId]);

        // Add an Inspector
        await sqlite.run(`INSERT INTO personas (nombre, apellido, codigo_interno, area_id, email, tipo_personal)
                          VALUES ('Maria', 'Inspector', 'INS001', 2, 'maria@test.com', 'administrativo')`);
        const insId = (await sqlite.get('SELECT last_insert_rowid() as id')).id;

        const rolInspector = await sqlite.get("SELECT id FROM roles WHERE nombre = 'Inspector'");
        await sqlite.run(`INSERT INTO usuarios (persona_id, rol_id, username, password_hash, estado_usuario, must_change_password)
                          VALUES (?, ?, 'maria', ?, 'Activo', 0)`, [insId, rolInspector.id, passwordHash]);

        console.log('Test users seeded');
    } catch (e) {
        console.error(e);
    }
}

seed();
