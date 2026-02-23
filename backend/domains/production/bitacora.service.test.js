const BitacoraService = require('./bitacora.service');
const ValidationError = require('../../shared/errors/ValidationError');
const AppError = require('../../shared/errors/AppError');

describe('BitacoraService', () => {
    let bitacoraService;
    let bitacoraRepositoryMock;
    let lineaEjecucionRepositoryMock;
    let registroTrabajoRepositoryMock;
    let muestraRepositoryMock;

    beforeEach(() => {
        bitacoraRepositoryMock = {
            findActive: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            close: jest.fn(),
            getResumenProcesos: jest.fn(),
            getRegistrosByProceso: jest.fn(),
            getMuestrasByProceso: jest.fn(),
            getProcesoStatus: jest.fn(),
            checkAssignmentsForProcess: jest.fn(),
            withTransaction: jest.fn(fn => fn())
        };
        lineaEjecucionRepositoryMock = {};
        registroTrabajoRepositoryMock = {};
        muestraRepositoryMock = {};

        bitacoraService = new BitacoraService(
            bitacoraRepositoryMock,
            lineaEjecucionRepositoryMock,
            registroTrabajoRepositoryMock,
            muestraRepositoryMock
        );
    });

    test('abrirBitacora lanza ValidationError si ya hay una abierta', async () => {
        bitacoraRepositoryMock.findActive.mockResolvedValue({ id: 1 });

        await expect(bitacoraService.openBitacora({}))
            .rejects.toThrow(ValidationError);
    });

    test('closeBitacora lanza AppError si el usuario no es el inspector ni ADMIN', async () => {
        bitacoraRepositoryMock.findById.mockResolvedValue({ id: 1, inspector: 'otro' });

        await expect(bitacoraService.closeBitacora(1, 'yo', 'OPERACIONES'))
            .rejects.toThrow(AppError);
    });

    test('closeBitacora lanza ValidationError si hay rechazos sin observaciones', async () => {
        bitacoraRepositoryMock.findById.mockResolvedValue({ id: 1, inspector: 'yo', turno: 'T1' });
        bitacoraRepositoryMock.getResumenProcesos.mockResolvedValue([{ id: 1, nombre: 'Proceso 1' }]);
        bitacoraRepositoryMock.getRegistrosByProceso.mockResolvedValue([{ observaciones: '' }]);
        bitacoraRepositoryMock.getMuestrasByProceso.mockResolvedValue([{ resultado: 'Rechazo' }]);
        bitacoraRepositoryMock.getProcesoStatus.mockResolvedValue({ no_operativo: 0 });
        bitacoraRepositoryMock.checkAssignmentsForProcess.mockResolvedValue(true);

        await expect(bitacoraService.closeBitacora(1, 'yo', 'INSPECTOR'))
            .rejects.toThrow(ValidationError);
    });

    test('closeBitacora lanza ValidationError si no hay personal asignado', async () => {
        bitacoraRepositoryMock.findById.mockResolvedValue({ id: 1, inspector: 'yo', turno: 'T1' });
        bitacoraRepositoryMock.getResumenProcesos.mockResolvedValue([{ id: 1, nombre: 'Proceso 1' }]);
        bitacoraRepositoryMock.getRegistrosByProceso.mockResolvedValue([{ id: 1, cantidad_producida: 10 }]);
        bitacoraRepositoryMock.getMuestrasByProceso.mockResolvedValue([]);
        bitacoraRepositoryMock.getProcesoStatus.mockResolvedValue({ no_operativo: 0 });
        bitacoraRepositoryMock.checkAssignmentsForProcess.mockResolvedValue(false);

        await expect(bitacoraService.closeBitacora(1, 'yo', 'INSPECTOR'))
            .rejects.toThrow(/personal asignado/);
    });
});
