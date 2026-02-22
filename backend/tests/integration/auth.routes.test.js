const request = require('supertest');
const app = require('../../app');
const { initDB, db } = require('../../database/sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env');

describe('Auth Routes Integration Tests', () => {
    beforeAll(async () => {
        // Asegurarse de que la base de datos está inicializada (en memoria para test)
        await new Promise((resolve) => {
            initDB();
            // Esperar un poco a que las semillas se inserten ya que initDB usa db.serialize pero es asíncrono en su ejecución interna
            setTimeout(resolve, 500);
        });
    });

    describe('POST /api/auth/login', () => {
        test('retorna 200 y token con credenciales válidas', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'admin',
                    password: 'admin123' // Valor por defecto en setup.sh y .env si no se cambió
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.user.username).toBe('admin');
        });

        test('retorna 401 con usuario inexistente', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistent',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Credenciales inválidas');
        });

        test('retorna 401 con contraseña incorrecta', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'admin',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Credenciales inválidas');
        });

        test('retorna 429 después de 5 intentos fallidos', async () => {
            // Ya hicimos algunos intentos fallidos arriba, completamos hasta 5
            for (let i = 0; i < 3; i++) {
                await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
            }

            // El 6to intento debería fallar por rate limit
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'admin',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(429);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Demasiados intentos');
        });
    });
});
