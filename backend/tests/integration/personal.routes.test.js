const request = require('supertest');
const app = require('../../app');
const { initDB, db } = require('../../database/sqlite');
const { bootstrapTestSystem } = require('../helpers/testUtils');

describe('Personal Routes Integration Tests', () => {
    let token;
    let personaId;

    beforeAll(async () => {
        // En tests, sqlite.js detecta NODE_ENV=test y usa :memory:
        await new Promise((resolve) => {
            initDB();
            setTimeout(resolve, 500);
        });

        await bootstrapTestSystem(app);

        // Login as admin para obtener token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'admin123' });
        token = loginRes.body.data.token;
    });

    test('POST /api/personal registra un nuevo empleado', async () => {
        const response = await request(app)
            .post('/api/personal')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Carlos',
                apellido: 'Gomez',
                codigo_interno: 'C001',
                area_id: 1,
                email: 'carlos@test.com',
                fecha_ingreso: '2024-01-01',
                rol_organizacional: 'Técnico Operador'
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        personaId = response.body.data.id;
    });

    test('PUT /api/personal/:id/estado actualiza el estado del usuario a Suspendido', async () => {
        const response = await request(app)
            .put(`/api/personal/${personaId}/estado`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                estado_usuario: 'Suspendido',
                motivo_cambio: 'Falta disciplinaria',
                categoria_motivo: 'AJUSTE_OPERATIVO'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Suspendido');
    });

    test('Login falla para usuario Suspendido', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'C001',
                password: 'wrong_password' // Debe fallar por estado antes que por password
            });

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('Suspendido');
    });

    test('POST /api/personal/:id/asignacion bloqueada para usuario Suspendido', async () => {
        const response = await request(app)
            .post(`/api/personal/${personaId}/asignacion`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                proceso_id: 1,
                turno: 'Mañana'
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Asignación bloqueada');
    });

    test('PUT /api/personal/:id/reactivar activa el usuario', async () => {
        const response = await request(app)
            .put(`/api/personal/${personaId}/reactivar`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                motivo_cambio: 'Cumplió sanción'
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('PUT /api/personal/:id/estado a Baja lógica es terminal', async () => {
        // 1. Poner en Baja lógica
        const resBaja = await request(app)
            .put(`/api/personal/${personaId}/estado`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                estado_usuario: 'Baja lógica',
                motivo_cambio: 'Despido',
                categoria_motivo: 'AJUSTE_OPERATIVO'
            });
        expect(resBaja.status).toBe(200);

        // 2. Intentar reactivar - Debe fallar
        const resReactivar = await request(app)
            .put(`/api/personal/${personaId}/reactivar`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                motivo_cambio: 'Error en despido'
            });

        expect(resReactivar.status).toBe(400);
        expect(resReactivar.body.error).toContain('irreversible');

        // 3. Intentar cambiar rol - Debe fallar
        const resRol = await request(app)
            .post(`/api/personal/${personaId}/rol`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                rol_id: 1,
                motivo_cambio: 'Ascenso post-mortem'
            });

        expect(resRol.status).toBe(400);
        expect(resRol.body.error).toContain('Baja lógica');
    });

    test('POST /api/personal/:id/rol requiere motivo_cambio', async () => {
        // Necesitamos otra persona activa
        const regRes = await request(app)
            .post('/api/personal')
            .set('Authorization', `Bearer ${token}`)
            .send({
                nombre: 'Ana',
                apellido: 'Sosa',
                codigo_interno: 'A002',
                area_id: 1,
                email: 'ana@test.com',
                fecha_ingreso: '2024-01-01',
                rol_organizacional: 'Técnico Operador'
            });
        const anaId = regRes.body.data.id;

        const response = await request(app)
            .post(`/api/personal/${anaId}/rol`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                rol_id: 1
                // falta motivo_cambio
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('obligatorio');
    });
});
