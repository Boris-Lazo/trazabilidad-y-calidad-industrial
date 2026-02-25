const PersonalService = require('./personal.service');
const ValidationError = require('../../shared/errors/ValidationError');

describe('PersonalService', () => {
    let personalService;
    let personalRepositoryMock;
    let auditServiceMock;

    beforeEach(() => {
        personalRepositoryMock = {
            getAllPersonas: jest.fn(),
            getPersonaById: jest.fn(),
            findByCodigoInterno: jest.fn(),
            findByEmail: jest.fn(),
            createPersona: jest.fn(),
            createUser: jest.fn(),
            assignRole: jest.fn(),
            findUserByPersonaId: jest.fn(),
            updateUserStatus: jest.fn(),
            updateUserRole: jest.fn(),
            assignOperation: jest.fn(),
            isAuxiliarWithActiveUser: jest.fn().mockResolvedValue(false),
            getRoles: jest.fn().mockResolvedValue([{ id: 5, nombre: 'Operario' }]),
            withTransaction: jest.fn(fn => fn())
        };
        auditServiceMock = {
            logChange: jest.fn(),
            logStatusChange: jest.fn(),
            logUpdate: jest.fn()
        };
        personalService = new PersonalService(personalRepositoryMock, auditServiceMock);
    });

    describe('registerStaff', () => {
        test('lanza error si el código interno ya existe', async () => {
            personalRepositoryMock.findByCodigoInterno.mockResolvedValue({ id: 1 });

            await expect(personalService.registerStaff({ codigo_interno: '123' }, 1))
                .rejects.toThrow(ValidationError);
        });

        test('crea persona, usuario y rol exitosamente', async () => {
            personalRepositoryMock.findByCodigoInterno.mockResolvedValue(null);
            personalRepositoryMock.findByEmail.mockResolvedValue(null);
            personalRepositoryMock.createPersona.mockResolvedValue(1);

            const result = await personalService.registerStaff({
                nombre: 'Juan',
                apellido: 'Perez',
                codigo_interno: '123',
                email: 'juan@test.com',
                rol_organizacional: 'Técnico Operador'
            }, 99);

            expect(personalRepositoryMock.createPersona).toHaveBeenCalled();
            expect(personalRepositoryMock.createUser).toHaveBeenCalledWith(expect.objectContaining({
                rol_id: 5, // Default from mock
                motivo_cambio: expect.any(String)
            }));
            expect(result).toHaveProperty('tempPassword');
        });
    });

    describe('updateUserStatus', () => {
        test('lanza error si no se proporciona motivo', async () => {
            await expect(personalService.updateUserStatus(1, 'Activo', 99, null))
                .rejects.toThrow(/motivo.*obligatorio/);
        });

        test('lanza error si el usuario está en Baja lógica', async () => {
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ id: 1, estado_usuario: 'Baja lógica' });

            await expect(personalService.updateUserStatus(1, 'Activo', 99, 'Reactivación'))
                .rejects.toThrow(/Estado terminal/);
        });

        test('actualiza el estado correctamente', async () => {
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ id: 1, estado_usuario: 'Suspendido' });

            await personalService.updateUserStatus(1, 'Activo', 99, 'Reactivación');

            expect(personalRepositoryMock.updateUserStatus).toHaveBeenCalledWith(1, 'Activo', 99, 'Reactivación');
            expect(auditServiceMock.logStatusChange).toHaveBeenCalled();
        });
    });

    describe('reactivateUser', () => {
        test('lanza error si el usuario está en Baja lógica', async () => {
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ id: 1, estado_usuario: 'Baja lógica' });

            await expect(personalService.reactivateUser(1, 99, 'Reactivación'))
                .rejects.toThrow(/Baja lógica es irreversible/);
        });

        test('reactiva un usuario suspendido', async () => {
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ id: 1, estado_usuario: 'Suspendido' });

            await personalService.reactivateUser(1, 99, 'Reactivación');

            expect(personalRepositoryMock.updateUserStatus).toHaveBeenCalledWith(1, 'Activo', 99, 'Reactivación');
            expect(auditServiceMock.logChange).toHaveBeenCalledWith(expect.objectContaining({
                accion: 'REACTIVACION_USUARIO'
            }));
        });
    });

    describe('assignOperation', () => {
        test('bloquea asignación si el usuario no está Activo', async () => {
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ persona_id: 1, estado_usuario: 'Suspendido' });

            await expect(personalService.assignOperation({ persona_id: 1, turno: 'Mañana' }, 99))
                .rejects.toThrow(/Asignación bloqueada/);
        });

        test('permite asignación si el usuario está Activo', async () => {
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ persona_id: 1, username: 'operario1', estado_usuario: 'Activo' });

            await personalService.assignOperation({ persona_id: 1, turno: 'Mañana' }, 99);

            expect(personalRepositoryMock.assignOperation).toHaveBeenCalled();
        });

        test('bloquea asignación si el usuario es admin técnico', async () => {
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ persona_id: 1, username: 'admin', estado_usuario: 'Activo' });

            await expect(personalService.assignOperation({ persona_id: 1, turno: 'Mañana' }, 99))
                .rejects.toThrow(/Excepción Técnica/);
        });
    });

    describe('assignRole', () => {
        test('realiza auditoría reforzada al cambiar rol', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1, rol_actual: 'Operario' });

            await personalService.assignRole(1, 2, 99, 'Ascenso a Supervisor');

            expect(personalRepositoryMock.updateUserRole).toHaveBeenCalledWith(1, 2, 99, 'Ascenso a Supervisor');
            expect(auditServiceMock.logChange).toHaveBeenCalledWith(expect.objectContaining({
                accion: 'ROLE_CHANGE',
                motivo_cambio: 'Ascenso a Supervisor'
            }));
        });
    });
});
