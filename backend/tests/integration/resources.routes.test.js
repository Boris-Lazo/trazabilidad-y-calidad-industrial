const request = require('supertest');
const app = require('../../app');
const sqlite = require('../../database/sqlite');
const { bootstrapTestSystem } = require('../helpers/testUtils');

describe('Resources Routes Integration Tests', () => {
    let token;
    let recursoId;
    let registroId;

    beforeAll(async () => {
        // En tests, sqlite.js usa :memory:
        await new Promise((resolve) => {
            sqlite.initDB();
            setTimeout(resolve, 800);
        });

        await bootstrapTestSystem(app);

        // Login as admin
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'admin123' });
        token = loginRes.body.data.token;

        // Crear un registro de trabajo ficticio
        const res = await sqlite.run(
            'INSERT INTO registros_trabajo (cantidad_producida, fecha_hora) VALUES (?, ?)',
            [100, new Date().toISOString()]
        );
        registroId = res.lastID;
    });

    test('GET /api/recursos retorna array', async () => {
        const response = await request(app)
            .get('/api/recursos')
            .set('Cookie', [`token=${token}`]);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/recursos crea un recurso', async () => {
        // Nota: Aunque los hints sugieren 'unidad', el repositorio real espera 'unidad_medida'
        const response = await request(app)
            .post('/api/recursos')
            .set('Cookie', [`token=${token}`])
            .send({
                codigo: 'R-001',
                nombre: 'Materia Prima A',
                descripcion: 'Test',
                tipo: 'Insumo',
                unidad_medida: 'kg'
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.nombre).toBe('Materia Prima A');
        recursoId = response.body.data.id;
    });

    test('POST /api/recursos sin autenticación retorna 401', async () => {
        const response = await request(app)
            .post('/api/recursos')
            .send({
                codigo: 'R-002',
                nombre: 'MP B',
                tipo: 'Insumo',
                unidad_medida: 'kg'
            });

        expect(response.status).toBe(401);
    });

    test('POST /api/consumos crea un consumo', async () => {
        // Nota: El repositorio real espera 'cantidad_consumida' en lugar de 'cantidad'
        const response = await request(app)
            .post('/api/consumos')
            .set('Cookie', [`token=${token}`])
            .send({
                recurso_id: recursoId,
                cantidad_consumida: 10,
                registro_trabajo_id: registroId,
                timestamp_consumo: new Date().toISOString()
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.recurso_id).toBe(recursoId);
    });
});
