const PersonalService = require('./personal.service');
const ValidationError = require('../../shared/errors/ValidationError');

describe('PersonalService', () => {
    let personalService;
    let personalRepositoryMock;

    beforeEach(() => {
        personalRepositoryMock = {
            getAllPersonas: jest.fn(),
            getPersonaById: jest.fn(),
            findByCodigoInterno: jest.fn(),
            findByEmail: jest.fn(),
            createPersona: jest.fn(),
            createUser: jest.fn(),
            assignRole: jest.fn(),
            withTransaction: jest.fn(fn => fn())
        };
        personalService = new PersonalService(personalRepositoryMock);
    });

    test('registerStaff lanza error si el código interno ya existe', async () => {
        personalRepositoryMock.findByCodigoInterno.mockResolvedValue({ id: 1 });

        await expect(personalService.registerStaff({ codigo_interno: '123' }, 1))
            .rejects.toThrow(ValidationError);
    });

    test('registerStaff crea persona, usuario y rol exitosamente', async () => {
        personalRepositoryMock.findByCodigoInterno.mockResolvedValue(null);
        personalRepositoryMock.findByEmail.mockResolvedValue(null);
        personalRepositoryMock.createPersona.mockResolvedValue(1);

        const result = await personalService.registerStaff({
            nombre: 'Juan',
            apellido: 'Perez',
            codigo_interno: '123',
            email: 'juan@test.com',
            rol_id: 1
        }, 99);

        expect(personalRepositoryMock.createPersona).toHaveBeenCalled();
        expect(personalRepositoryMock.createUser).toHaveBeenCalled();
        expect(personalRepositoryMock.assignRole).toHaveBeenCalled();
        expect(result).toHaveProperty('tempPassword');
    });
});
