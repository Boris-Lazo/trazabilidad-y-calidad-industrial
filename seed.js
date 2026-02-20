
const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function seed() {
    const username = 'admin';
    const password = 'admin_password'; // En producción esto debería estar en .env
    const hashedPassword = await bcrypt.hash(password, 10);
    const rol = 'ADMIN';
    const nombre = 'Administrador Sistema';

    db.serialize(() => {
        db.run('INSERT OR IGNORE INTO usuarios (username, password, rol, nombre) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, rol, nombre], (err) => {
            if (err) {
                console.error('Error al sembrar usuario admin:', err.message);
            } else {
                console.log('Usuario admin verificado/creado con éxito.');
            }
            process.exit();
        });
    });
}

seed();
