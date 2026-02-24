const request = require('supertest');
const app = require('../../app');
const { initDB, db } = require('../../database/sqlite');

describe('Bootstrap Routes Integration Tests', () => {
    beforeAll(async () => {
        // Asegurarse de que la base de datos está inicializada (en memoria para test)
        await new Promise((resolve) => {
            initDB();
            setTimeout(resolve, 500);
        });
    });

    describe('GET /api/bootstrap/status', () => {
        test('retorna initialized: false al inicio', async () => {
            const response = await request(app).get('/api/bootstrap/status');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.initialized).toBe(false);
        });
    });

    describe('GET /api/bootstrap/data', () => {
        test('retorna áreas disponibles', async () => {
            const response = await request(app).get('/api/bootstrap/data');
            expect(response.status).toBe(200);
            expect(response.body.data.areas.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/bootstrap/init', () => {
        test('inicializa el sistema correctamente', async () => {
            const bootstrapData = {
                nombre: 'Admin',
                apellido: 'Sistema',
                codigo_interno: 'ADMIN01',
                area_id: 1,
                email: 'admin@test.com',
                password: 'password123',
                telefono: '12345678'
            };

            const response = await request(app)
                .post('/api/bootstrap/init')
                .send(bootstrapData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);

            // Verificar que el estado cambió
            const statusRes = await request(app).get('/api/bootstrap/status');
            expect(statusRes.body.data.initialized).toBe(true);
        });

        test('prohíbe doble inicialización', async () => {
            const response = await request(app)
                .post('/api/bootstrap/init')
                .send({ /* datos cualesquiera */ });

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('El sistema ya ha sido inicializado.');
        });
    });
});
