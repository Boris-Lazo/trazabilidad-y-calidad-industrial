const GruposService = require('./grupos.service');
const ValidationError = require('../../shared/errors/ValidationError');

describe('GruposService', () => {
  let groupsRepo, personalRepo, auditService, groupsService;

  beforeEach(() => {
    groupsRepo = {
      getGrupoById: jest.fn(),
      getIntegrantesByGrupo: jest.fn(),
      addIntegrante: jest.fn(),
      removeIntegrante: jest.fn(),
      updateTurnoGrupo: jest.fn(),
      withTransaction: jest.fn(fn => fn())
    };
    personalRepo = {
      getPersonaById: jest.fn(),
      findUserByPersonaId: jest.fn(),
      isAuxiliarWithActiveUser: jest.fn().mockResolvedValue(false)
    };
    auditService = {
      logChange: jest.fn()
    };
    groupsService = new GruposService(groupsRepo, personalRepo, auditService);
  });

  test('no debe permitir añadir personal administrativo a grupos operativos', async () => {
    groupsRepo.getGrupoById.mockResolvedValue({ id: 1, nombre: 'Grupo A', tipo: 'operativo' });
    personalRepo.getPersonaById.mockResolvedValue({ id: 10, nombre: 'Juan', apellido: 'Pérez', area_nombre: 'Administración' });
    personalRepo.findUserByPersonaId.mockResolvedValue({ estado_usuario: 'Activo' });
    groupsRepo.getIntegrantesByGrupo.mockResolvedValue([]);

    await expect(groupsService.addIntegrante(1, 10, 'Test', 1))
      .rejects.toThrow('Un colaborador administrativo no puede pertenecer a un grupo operativo');
  });

  test('no debe permitir añadir personal operativo al grupo administrativo', async () => {
    groupsRepo.getGrupoById.mockResolvedValue({ id: 4, nombre: 'Administrativo', tipo: 'administrativo' });
    personalRepo.getPersonaById.mockResolvedValue({ id: 11, nombre: 'Pedro', apellido: 'Gómez', area_nombre: 'Producción' });
    personalRepo.findUserByPersonaId.mockResolvedValue({ estado_usuario: 'Activo' });
    groupsRepo.getIntegrantesByGrupo.mockResolvedValue([]);

    await expect(groupsService.addIntegrante(4, 11, 'Test', 1))
      .rejects.toThrow('Un colaborador operativo no puede pertenecer al grupo administrativo');
  });

  test('debe permitir añadir un operativo a un grupo operativo', async () => {
    groupsRepo.getGrupoById.mockResolvedValue({ id: 1, nombre: 'Grupo A', tipo: 'operativo' });
    personalRepo.getPersonaById.mockResolvedValue({ id: 11, nombre: 'Pedro', apellido: 'Gómez', area_nombre: 'Producción' });
    personalRepo.findUserByPersonaId.mockResolvedValue({ estado_usuario: 'Activo' });
    groupsRepo.getIntegrantesByGrupo.mockResolvedValue([]);

    const result = await groupsService.addIntegrante(1, 11, 'Cambio de turno', 1);

    expect(result).toBe(true);
    expect(groupsRepo.addIntegrante).toHaveBeenCalled();
    expect(auditService.logChange).toHaveBeenCalledWith(expect.objectContaining({
      accion: 'GRUPO_ADD_INTEGRANTE'
    }));
  });

  test('no debe permitir remover a alguien que no está en el grupo', async () => {
    groupsRepo.getGrupoById.mockResolvedValue({ id: 1, nombre: 'Grupo A', tipo: 'operativo' });
    groupsRepo.getIntegrantesByGrupo.mockResolvedValue([]); // grupo vacío

    await expect(groupsService.removeIntegrante(1, 99, 'motivo válido', 1))
      .rejects.toThrow('El colaborador no pertenece a este grupo');
  });
});
