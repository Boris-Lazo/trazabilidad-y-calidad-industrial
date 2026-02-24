const request = require('supertest');

const bootstrapTestSystem = async (app) => {
    return await request(app)
        .post('/api/bootstrap/init')
        .send({
            nombre: 'Admin',
            apellido: 'Test',
            codigo_interno: 'admin',
            area_id: 1,
            email: 'admin@test.com',
            password: 'admin123'
        });
};

module.exports = { bootstrapTestSystem };
