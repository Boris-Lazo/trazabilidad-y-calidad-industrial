const AuthService = require('./auth.service');
const UnauthorizedError = require('../../shared/errors/UnauthorizedError');

describe('AuthService', () => {
    let authService;
    let authRepositoryMock;
    let tokenServiceMock;

    beforeEach(() => {
        authRepositoryMock = {
            findByUsername: jest.fn()
        };
        tokenServiceMock = {
            generateAccessToken: jest.fn()
        };
        authService = new AuthService(authRepositoryMock, tokenServiceMock);
    });

    test('login exitoso retorna token y datos de usuario', async () => {
        const user = { id: 1, username: 'testuser', password: 'hashedpassword', rol: 'ADMIN', nombre: 'Test User' };
        authRepositoryMock.findByUsername.mockResolvedValue(user);

        // Mock de bcrypt.compare se maneja implícitamente si usamos contraseñas reales,
        // pero aquí mockeamos AuthService que usa bcrypt.
        // Para simplificar, podemos mockear bcrypt o dejar que corra (necesitaríamos un hash real).
        const bcrypt = require('bcrypt');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

        tokenServiceMock.generateAccessToken.mockReturnValue('mock-token');

        const result = await authService.login('testuser', 'password123');

        expect(result.token).toBe('mock-token');
        expect(result.user.username).toBe('testuser');
        expect(authRepositoryMock.findByUsername).toHaveBeenCalledWith('testuser');
    });

    test('login con usuario inexistente lanza UnauthorizedError', async () => {
        authRepositoryMock.findByUsername.mockResolvedValue(null);
        const bcrypt = require('bcrypt');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

        await expect(authService.login('wronguser', 'password'))
            .rejects.toThrow(UnauthorizedError);
    });

    test('login con contraseña incorrecta lanza UnauthorizedError', async () => {
        const user = { id: 1, username: 'testuser', password: 'hashedpassword' };
        authRepositoryMock.findByUsername.mockResolvedValue(user);
        const bcrypt = require('bcrypt');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

        await expect(authService.login('testuser', 'wrongpassword'))
            .rejects.toThrow(UnauthorizedError);
    });
});
