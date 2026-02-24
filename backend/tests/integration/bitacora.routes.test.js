const request = require('supertest');
const app = require('../../app');
const { initDB, db } = require('../../database/sqlite');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env');
const { bootstrapTestSystem } = require('../helpers/testUtils');

describe('Bitacora Routes Integration Tests', () => {
    let adminToken;

    beforeAll(async () => {
        await new Promise((resolve) => {
            initDB();
            setTimeout(resolve, 500);
        });

        await bootstrapTestSystem(app);

        adminToken = jwt.sign({ id: 1, username: 'admin', rol: 'ADMIN' }, JWT_SECRET);
    });

    describe('GET /api/bitacora/estado', () => {
        test('retorna 200 y el estado de la bitácora', async () => {
            const response = await request(app)
                .get('/api/bitacora/estado')
                .set('Cookie', [`token=${adminToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('abierta');
        });
    });

    describe('GET /api/bitacora/tiempo-actual', () => {
        test('retorna 200 y la información del tiempo actual', async () => {
            const response = await request(app)
                .get('/api/bitacora/tiempo-actual')
                .set('Cookie', [`token=${adminToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('hora');
            expect(response.body.data).toHaveProperty('turno');
        });
    });
});
