const request = require('supertest');
const app = require('../../app');
const { initDB, db } = require('../../database/sqlite');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env');

describe('Production Routes RBAC Integration Tests', () => {
    let adminToken;
    let inspectorToken;

    beforeAll(async () => {
        await new Promise((resolve) => {
            initDB();
            setTimeout(resolve, 500);
        });

        // Crear tokens manuales para evitar depender del endpoint de login en cada test
        adminToken = jwt.sign({ id: 1, username: 'admin', rol: 'ADMIN' }, JWT_SECRET);
        inspectorToken = jwt.sign({ id: 2, username: 'inspector', rol: 'INSPECTOR' }, JWT_SECRET);
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
        test('retorna 401 con token de rol INSPECTOR (no autorizado)', async () => {
            const response = await request(app)
                .post('/api/ordenes-produccion')
                .set('Cookie', [`token=${inspectorToken}`])
                .send({
                    codigo_orden: 'ORD-001',
                    producto: 'Test',
                    cantidad_objetivo: 100
                });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('No tiene permisos');
        });

        test('retorna 201 con token de rol ADMIN', async () => {
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
