const MaquinaService = require('./maquina.service');
const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

describe('MaquinaService', () => {
    let maquinaService;
    let mockRepo;
    let mockAudit;

    beforeEach(() => {
        mockRepo = {
            findAll: jest.fn(),
            findById: jest.fn(),
            updateEstado: jest.fn(),
            getHistorialEstados: jest.fn(),
            db: {
                get: jest.fn(),
                withTransaction: jest.fn(fn => fn())
            }
        };
        mockAudit = {
            logStatusChange: jest.fn()
        };
        maquinaService = new MaquinaService(mockRepo, mockAudit);
    });

    test('getAllMachines llama al repositorio', async () => {
        await maquinaService.getAllMachines();
        expect(mockRepo.findAll).toHaveBeenCalled();
    });

    test('updateMachineStatus lanza error si la máquina no existe', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(maquinaService.updateMachineStatus(1, { nuevoEstado: 'Operativa' }))
            .rejects.toThrow(NotFoundError);
    });

    test('updateMachineStatus lanza error si ya está en ese estado', async () => {
        mockRepo.findById.mockResolvedValue({ id: 1, estado_actual: 'Operativa' });
        await expect(maquinaService.updateMachineStatus(1, { nuevoEstado: 'Operativa' }))
            .rejects.toThrow(ValidationError);
    });

    test('updateMachineStatus lanza error si está dada de baja', async () => {
        mockRepo.findById.mockResolvedValue({ id: 1, estado_actual: 'Baja' });
        await expect(maquinaService.updateMachineStatus(1, { nuevoEstado: 'Operativa' }))
            .rejects.toThrow(ValidationError);
    });

    test('updateMachineStatus lanza error si tiene órdenes activas al pasar a no operativo', async () => {
        mockRepo.findById.mockResolvedValue({ id: 1, estado_actual: 'Operativa' });
        mockRepo.db.get.mockResolvedValue({ count: 1 }); // Órdenes activas

        await expect(maquinaService.updateMachineStatus(1, { nuevoEstado: 'Fuera de servicio' }))
            .rejects.toThrow('No se puede cambiar el estado a uno no operativo mientras existan órdenes de producción activas');
    });

    test('updateMachineStatus actualiza y audita correctamente', async () => {
        mockRepo.findById.mockResolvedValue({ id: 1, estado_actual: 'Disponible', nombre_visible: 'T-01' });
        mockRepo.db.get.mockResolvedValue({ count: 0 });

        await maquinaService.updateMachineStatus(1, {
            nuevoEstado: 'En mantenimiento',
            motivo: 'Cambio de aceite',
            categoria: 'MANTENIMIENTO_PREVENTIVO',
            usuario: 'admin'
        });

        expect(mockRepo.updateEstado).toHaveBeenCalledWith(1, 'En mantenimiento', 'Cambio de aceite', 'MANTENIMIENTO_PREVENTIVO', 'admin', expect.any(Object));
        expect(mockAudit.logStatusChange).toHaveBeenCalled();
    });
});
