const request = require('supertest');
const app = require('../../app');
const { initDB } = require('../../database/sqlite');
const sqlite = require('../../database/sqlite');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env');
const { bootstrapTestSystem } = require('../helpers/testUtils');

describe('Procesos Routes Integration Tests', () => {
    let adminToken;
    let inspectorToken;
    let supervisorToken;
    let gerenciaToken;
    let operarioToken;

    beforeAll(async () => {
        // Inicializar DB y esperar a que terminen las semillas internas
        await new Promise((resolve) => {
            initDB();
            setTimeout(resolve, 1500);
        });

        // El bootstrap crea al admin (usuario_id 1, persona_id 1)
        await bootstrapTestSystem(app);

        // id: 2 - Inspector (rol_id 1)
        await sqlite.run(`
            INSERT INTO personas (id, nombre, apellido, codigo_interno, area_id, email, rol_organizacional)
            VALUES (2, 'Inspector', 'Test', 'inspector', 1, 'inspector@test.com', 'Inspector de Calidad')
        `);
        await sqlite.run(`
            INSERT INTO usuarios (id, persona_id, username, password_hash, rol_id, estado_usuario)
            VALUES (2, 2, 'inspector', 'hash', 1, 'Activo')
        `);

        // id: 3 - Supervisor (rol_id 2)
        await sqlite.run(`
            INSERT INTO personas (id, nombre, apellido, codigo_interno, area_id, email, rol_organizacional)
            VALUES (3, 'Supervisor', 'Test', 'supervisor', 1, 'supervisor@test.com', 'Supervisor de Planta')
        `);
        await sqlite.run(`
            INSERT INTO usuarios (id, persona_id, username, password_hash, rol_id, estado_usuario)
            VALUES (3, 3, 'supervisor', 'hash', 2, 'Activo')
        `);

        // id: 4 - Gerencia (rol_id 4)
        await sqlite.run(`
            INSERT INTO personas (id, nombre, apellido, codigo_interno, area_id, email, rol_organizacional)
            VALUES (4, 'Gerencia', 'Test', 'gerencia', 1, 'gerencia@test.com', 'Gerente General')
        `);
        await sqlite.run(`
            INSERT INTO usuarios (id, persona_id, username, password_hash, rol_id, estado_usuario)
            VALUES (4, 4, 'gerencia', 'hash', 4, 'Activo')
        `);

        // id: 5 - Operario (rol_id 5)
        await sqlite.run(`
            INSERT INTO personas (id, nombre, apellido, codigo_interno, area_id, email, rol_organizacional)
            VALUES (5, 'Operario', 'Test', 'operario', 1, 'operario@test.com', 'Operario de Planta')
        `);
        await sqlite.run(`
            INSERT INTO usuarios (id, persona_id, username, password_hash, rol_id, estado_usuario)
            VALUES (5, 5, 'operario', 'hash', 5, 'Activo')
        `);

        adminToken      = jwt.sign({ usuario_id: 1, username: 'admin',      rol: 'Administrador' }, JWT_SECRET);
        inspectorToken  = jwt.sign({ usuario_id: 2, username: 'inspector',  rol: 'Inspector'     }, JWT_SECRET);
        supervisorToken = jwt.sign({ usuario_id: 3, username: 'supervisor', rol: 'Supervisor'    }, JWT_SECRET);
        gerenciaToken   = jwt.sign({ usuario_id: 4, username: 'gerencia',   rol: 'Gerencia'      }, JWT_SECRET);
        operarioToken   = jwt.sign({ usuario_id: 5, username: 'operario',   rol: 'Operario'      }, JWT_SECRET);
    });

    describe('GET /api/procesos', () => {
        test('retorna 401 sin token', async () => {
            const res = await request(app).get('/api/procesos');
            expect(res.status).toBe(401);
        });

        test('retorna 200 con token de Administrador y devuelve 9 procesos', async () => {
            const res = await request(app)
                .get('/api/procesos')
                .set('Cookie', [`token=${adminToken}`]);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data).toHaveLength(9);
        });

        test('cada proceso tiene los campos obligatorios del contrato', async () => {
            const res = await request(app)
                .get('/api/procesos')
                .set('Cookie', [`token=${adminToken}`]);
            const proceso = res.body.data[0];
            expect(proceso).toHaveProperty('processId');
            expect(proceso).toHaveProperty('nombre');
            expect(proceso).toHaveProperty('unidadProduccion');
            expect(proceso).toHaveProperty('area');
            expect(proceso).toHaveProperty('estado');
            expect(proceso).toHaveProperty('version');
            expect(proceso).toHaveProperty('historial');
            expect(Array.isArray(proceso.historial)).toBe(true);
        });

        test('retorna 200 con token de Inspector', async () => {
            const res = await request(app)
                .get('/api/procesos')
                .set('Cookie', [`token=${inspectorToken}`]);
            expect(res.status).toBe(200);
        });

        test('retorna 200 con token de Supervisor (permiso VIEW_PROCESSES)', async () => {
            const res = await request(app)
                .get('/api/procesos')
                .set('Cookie', [`token=${supervisorToken}`]);
            expect(res.status).toBe(200);
        });

        test('retorna 200 con token de Gerencia (permiso VIEW_PROCESSES)', async () => {
            const res = await request(app)
                .get('/api/procesos')
                .set('Cookie', [`token=${gerenciaToken}`]);
            expect(res.status).toBe(200);
        });

        test('retorna 403 con token de Operario (sin permiso VIEW_PROCESSES)', async () => {
            const res = await request(app)
                .get('/api/procesos')
                .set('Cookie', [`token=${operarioToken}`]);
            expect(res.status).toBe(403);
        });
    });
});
