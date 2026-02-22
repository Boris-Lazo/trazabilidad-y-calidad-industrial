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
            db: {
                beginTransaction: jest.fn(),
                commit: jest.fn(),
                rollback: jest.fn()
            }
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
        bitacoraRepositoryMock.findById.mockResolvedValue({ id: 1, inspector: 'yo' });
        bitacoraRepositoryMock.getResumenProcesos.mockResolvedValue([{ id: 1, nombre: 'Proceso 1' }]);
        bitacoraRepositoryMock.getRegistrosByProceso.mockResolvedValue([{ observations: '' }]);
        bitacoraRepositoryMock.getMuestrasByProceso.mockResolvedValue([{ resultado: 'Rechazo' }]);

        await expect(bitacoraService.closeBitacora(1, 'yo', 'INSPECTOR'))
            .rejects.toThrow(ValidationError);
    });
});
