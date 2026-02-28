const request = require('supertest');
const app = require('../../app');
const sqlite = require('../../database/sqlite');
const { bootstrapTestSystem } = require('../helpers/testUtils');

describe('Quality Routes Integration Tests', () => {
    let token;
    let loteId;
    let ordenId;

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

        // Crear una bitácora
        const bitacoraRes = await sqlite.run(
            "INSERT INTO bitacora_turno (turno, fecha_operativa, inspector, estado) VALUES ('T1', '2024-01-01', 'Admin', 'ABIERTA')"
        );
        const bitacoraId = bitacoraRes.lastID;

        // Crear una orden de producción ficticia
        const res = await sqlite.run(
            'INSERT INTO orden_produccion (codigo_orden, producto, cantidad_objetivo, estado, fecha_creacion) VALUES (?, ?, ?, ?, ?)',
            ['2000001', 'Producto Test', 1000, 'Liberada', new Date().toISOString()]
        );
        ordenId = res.lastID;

        // Crear un lote válido
        const loteRes = await sqlite.run(
            'INSERT INTO lotes (codigo_lote, orden_produccion_id, bitacora_id, correlativo, fecha_produccion, estado) VALUES (?, ?, ?, ?, ?, ?)',
            ['L-TEST-INITIAL', ordenId, bitacoraId, 1, '2024-01-01', 'activo']
        );
        loteId = loteRes.lastID;
    });

    test('GET /api/lotes/activos retorna array de lotes', async () => {
        const response = await request(app)
            .get('/api/lotes/activos')
            .set('Cookie', [`token=${token}`]);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('POST /api/lotes sin autenticación retorna 401', async () => {
        const response = await request(app)
            .post('/api/lotes')
            .send({
                codigo_lote: 'L-002',
                fecha_produccion: '2024-01-01',
                orden_produccion_id: ordenId
            });

        expect(response.status).toBe(401);
    });

    test('GET /api/lotes/orden/:id retorna array de lotes', async () => {
        const response = await request(app)
            .get(`/api/lotes/orden/${ordenId}`)
            .set('Cookie', [`token=${token}`]);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('POST /api/muestras retorna 201', async () => {
        const response = await request(app)
            .post('/api/muestras')
            .set('Cookie', [`token=${token}`])
            .send({
                codigo_muestra: 'M-001',
                lote_id: loteId,
                parametro: 'Ancho',
                valor: 20.5,
                resultado: 'Aprobado',
                usuario_modificacion: 'admin'
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
    });

    test('GET /api/muestras/lote/:id retorna array de muestras', async () => {
        const response = await request(app)
            .get(`/api/muestras/lote/${loteId}`)
            .set('Cookie', [`token=${token}`]);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].codigo_muestra).toBe('M-001');
    });
});
