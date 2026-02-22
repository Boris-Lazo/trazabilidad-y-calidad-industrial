const IncidenteService = require('./incidente.service');

describe('IncidenteService', () => {
    let incidenteService;
    let incidenteRepositoryMock;

    beforeEach(() => {
        incidenteRepositoryMock = {
            findAll: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn()
        };
        incidenteService = new IncidenteService(incidenteRepositoryMock);
    });

    test('getAll retorna todos los incidentes', async () => {
        const mockIncidentes = [{ id: 1, titulo: 'Incidente 1' }];
        incidenteRepositoryMock.findAll.mockResolvedValue(mockIncidentes);

        const result = await incidenteService.getAll();

        expect(result).toEqual(mockIncidentes);
        expect(incidenteRepositoryMock.findAll).toHaveBeenCalled();
    });

    test('create llama al repositorio y retorna el nuevo incidente', async () => {
        const data = { titulo: 'Nuevo Incidente' };
        incidenteRepositoryMock.create.mockResolvedValue(1);
        incidenteRepositoryMock.findById.mockResolvedValue({ id: 1, ...data });

        const result = await incidenteService.create(data);

        expect(result.id).toBe(1);
        expect(incidenteRepositoryMock.create).toHaveBeenCalledWith(data);
    });
});
