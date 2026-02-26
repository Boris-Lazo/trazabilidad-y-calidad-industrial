const request = require('supertest');
const app = require('../../app');
const { initDB, db } = require('../../database/sqlite');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env');
const { bootstrapTestSystem } = require('../helpers/testUtils');

describe('Production Routes RBAC Integration Tests', () => {
    let adminToken;
    let inspectorToken;

    beforeAll(async () => {
        await new Promise((resolve) => {
            initDB();
            setTimeout(resolve, 500);
        });

        await bootstrapTestSystem(app);

        // Insertar un inspector en la DB para que authMiddleware lo encuentre
        await db.run(`
            INSERT INTO personas (id, nombre, apellido, codigo_interno, area_id, email, rol_organizacional)
            VALUES (2, 'Inspector', 'Test', 'inspector', 1, 'inspector@test.com', 'Inspector de Calidad')
        `);
        await db.run(`
            INSERT INTO usuarios (id, persona_id, username, password_hash, rol_id, estado_usuario)
            VALUES (2, 2, 'inspector', 'hash', (SELECT id FROM roles WHERE nombre = 'Inspector'), 'Activo')
        `);

        // Crear tokens manuales con los nombres de rol correctos
        adminToken = jwt.sign({ id: 1, usuario_id: 1, username: 'admin', rol: 'Administrador' }, JWT_SECRET);
        inspectorToken = jwt.sign({ id: 2, usuario_id: 2, username: 'inspector', rol: 'Inspector' }, JWT_SECRET);
    });

    describe('GET /api/ordenes-produccion', () => {
        test('retorna 401 sin token', async () => {
            const response = await request(app).get('/api/ordenes-produccion');
            expect(response.status).toBe(401);
        });

        test('retorna 200 con token válido', async () => {
            const response = await request(app)
                .get('/api/ordenes-produccion')
                .set('Cookie', [`token=${adminToken}`]); // authMiddleware busca en cookies

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/ordenes-produccion', () => {
        test('retorna 403 con token de rol Supervisor (no autorizado)', async () => {
            const supervisorToken = jwt.sign({ id: 3, usuario_id: 3, username: 'supervisor', rol: 'Supervisor' }, JWT_SECRET);

            // Insertar supervisor
            await db.run(`
                INSERT INTO personas (id, nombre, apellido, codigo_interno, area_id, email, rol_organizacional)
                VALUES (3, 'Supervisor', 'Test', 'supervisor', 1, 'supervisor@test.com', 'Supervisor de Producción')
            `);
            await db.run(`
                INSERT INTO usuarios (id, persona_id, username, password_hash, rol_id, estado_usuario)
                VALUES (3, 3, 'supervisor', 'hash', (SELECT id FROM roles WHERE nombre = 'Supervisor'), 'Activo')
            `);

            const response = await request(app)
                .post('/api/ordenes-produccion')
                .set('Cookie', [`token=${supervisorToken}`])
                .send({
                    codigo_orden: '1000001',
                    producto: 'Test',
                    cantidad_objetivo: 100
                });

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('No tiene permisos');
        });

        test('retorna 201 con token de rol Administrador', async () => {
            const response = await request(app)
                .post('/api/ordenes-produccion')
                .set('Cookie', [`token=${adminToken}`])
                .send({
                    codigo_orden: 'ORD-INT-001',
                    producto: 'Test Integration',
                    cantidad_objetivo: 500,
                    unidad: 'kg'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });
    });
});
