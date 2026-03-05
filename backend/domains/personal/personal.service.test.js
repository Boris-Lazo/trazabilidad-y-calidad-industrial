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
            updatePersona: jest.fn(),
            updateUserRole: jest.fn(),
            assignOperation: jest.fn(),
            resetPassword: jest.fn(),
            isAuxiliarWithActiveUser: jest.fn().mockResolvedValue(false),
            getRoles: jest.fn().mockResolvedValue([{ id: 5, nombre: 'Operario' }]),
            withTransaction: jest.fn(fn => fn()),
            db: {
                get: jest.fn()
            }
        };
        auditServiceMock = {
            logChange: jest.fn(),
            logStatusChange: jest.fn(),
            logUpdate: jest.fn()
        };
        personalService = new PersonalService(personalRepositoryMock, auditServiceMock);
    });

    describe('_enrichEstado', () => {
        test('mantiene estado si no ha vencido la ausencia', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const fechaStr = tomorrow.toISOString().split('T')[0];

            const persona = {
                estado_laboral: 'Incapacitado',
                ausencia_hasta: fechaStr
            };

            const enriched = personalService._enrichEstado(persona);
            expect(enriched.estado_efectivo).toBe('Incapacitado');
            expect(enriched.ausencia_vencida).toBe(false);
        });

        test('cambia a Activo y marca como vencida si ya pasó la fecha', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const fechaStr = yesterday.toISOString().split('T')[0];

            const persona = {
                estado_laboral: 'Incapacitado',
                ausencia_hasta: fechaStr
            };

            const enriched = personalService._enrichEstado(persona);
            expect(enriched.estado_efectivo).toBe('Activo');
            expect(enriched.ausencia_vencida).toBe(true);
        });
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
                rol_id: 5,
                motivo_cambio: expect.any(String)
            }));
            expect(result).toHaveProperty('tempPassword');
        });
    });

    describe('updateStaff', () => {
        test('lanza error si el colaborador está de Baja', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1, estado_laboral: 'Baja' });

            await expect(personalService.updateStaff(1, { nombre: 'Pedro' }, 99))
                .rejects.toThrow(/Estado terminal/);
        });

        test('valida campos obligatorios para Incapacitado', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1, estado_laboral: 'Activo' });

            await expect(personalService.updateStaff(1, { estado_laboral: 'Incapacitado' }, 99))
                .rejects.toThrow(/fecha de inicio de ausencia es obligatoria/);
        });

        test('limpia campos de ausencia al volver a Activo', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1, estado_laboral: 'Incapacitado' });

            await personalService.updateStaff(1, { estado_laboral: 'Activo' }, 99);

            expect(personalRepositoryMock.updatePersona).toHaveBeenCalledWith(1, expect.objectContaining({
                estado_laboral: 'Activo',
                ausencia_desde: null,
                ausencia_hasta: null,
                tipo_ausencia: null,
                motivo_ausencia: null
            }));
        });
    });

    describe('assignOperation', () => {
        test('bloquea asignación si el colaborador no está Activo', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1, estado_laboral: 'Incapacitado' });

            await expect(personalService.assignOperation({ persona_id: 1, turno: 'Mañana' }, 99))
                .rejects.toThrow(/Asignación bloqueada/);
        });

        test('permite asignación si el colaborador está Activo', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1, estado_laboral: 'Activo' });
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ id: 10, username: 'operario1' });

            await personalService.assignOperation({ persona_id: 1, turno: 'Mañana' }, 99);

            expect(personalRepositoryMock.assignOperation).toHaveBeenCalled();
        });
    });

    describe('assignRole', () => {
        test('bloquea cambio de rol si está de Baja', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1, estado_laboral: 'Baja' });

            await expect(personalService.assignRole(1, 2, 99, 'Cambio'))
                .rejects.toThrow(/Estado terminal/);
        });

        test('realiza auditoría al cambiar rol', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1, estado_laboral: 'Activo', rol_actual: 'Operario' });

            await personalService.assignRole(1, 2, 99, 'Ascenso');

            expect(personalRepositoryMock.updateUserRole).toHaveBeenCalledWith(1, 2, 99, 'Ascenso');
            expect(auditServiceMock.logChange).toHaveBeenCalled();
        });
    });

    describe('resetPassword', () => {
        test('genera nueva contraseña temporal', async () => {
            personalRepositoryMock.getPersonaById.mockResolvedValue({ id: 1 });
            personalRepositoryMock.findUserByPersonaId.mockResolvedValue({ id: 10, username: 'user1' });

            const result = await personalService.resetPassword(1, 99);

            expect(personalRepositoryMock.resetPassword).toHaveBeenCalled();
            expect(result).toHaveProperty('tempPassword');
            expect(auditServiceMock.logChange).toHaveBeenCalledWith(expect.objectContaining({
                accion: 'PASSWORD_RESET'
            }));
        });
    });
});
