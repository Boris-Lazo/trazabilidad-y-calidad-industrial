const BitacoraService = require('./bitacora.service');
const ValidationError = require('../../shared/errors/ValidationError');
const AppError = require('../../shared/errors/AppError');

describe('BitacoraService', () => {
    let bitacoraService;
    let bitacoraRepositoryMock;
    let lineaEjecucionRepositoryMock;
    let registroTrabajoRepositoryMock;
    let muestraRepositoryMock;
    let auditServiceMock;
    let paroRepositoryMock;

    beforeEach(() => {
        bitacoraRepositoryMock = {
            findActive: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            updateEstado: jest.fn(),
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
        paroRepositoryMock = {
            sumMinutosByBitacoraAndProceso: jest.fn()
        };
        auditServiceMock = {
            logStatusChange: jest.fn(),
            logUpdate: jest.fn()
        };

        bitacoraService = new BitacoraService(
            bitacoraRepositoryMock,
            lineaEjecucionRepositoryMock,
            registroTrabajoRepositoryMock,
            muestraRepositoryMock,
            auditServiceMock,
            paroRepositoryMock
        );
    });

    test('abrirBitacora lanza ValidationError si ya hay una abierta', async () => {
        bitacoraRepositoryMock.findActive.mockResolvedValue({ id: 1 });

        await expect(bitacoraService.openBitacora({}))
            .rejects.toThrow(ValidationError);
    });

    test('closeBitacora lanza AppError si el usuario no es el inspector ni Administrador', async () => {
        bitacoraRepositoryMock.findById.mockResolvedValue({ id: 1, inspector: 'otro', estado: 'ABIERTA' });

        await expect(bitacoraService.closeBitacora(1, 'yo', 'Operario'))
            .rejects.toThrow(AppError);
    });

    test('closeBitacora lanza ValidationError si hay rechazos sin observaciones', async () => {
        bitacoraRepositoryMock.findById.mockResolvedValue({ id: 1, inspector: 'yo', turno: 'T1', estado: 'ABIERTA' });
        bitacoraRepositoryMock.getResumenProcesos.mockResolvedValue([{ id: 1, nombre: 'Proceso 1' }]);
        bitacoraRepositoryMock.getRegistrosByProceso.mockResolvedValue([{ observaciones: '' }]);
        bitacoraRepositoryMock.getMuestrasByProceso.mockResolvedValue([{ resultado: 'Rechazo' }]);
        bitacoraRepositoryMock.getProcesoStatus.mockResolvedValue({ no_operativo: 0 });
        bitacoraRepositoryMock.checkAssignmentsForProcess.mockResolvedValue(true);
        paroRepositoryMock.sumMinutosByBitacoraAndProceso.mockResolvedValue(0);

        await expect(bitacoraService.closeBitacora(1, 'yo', 'Inspector'))
            .rejects.toThrow(ValidationError);
    });

    test('closeBitacora lanza ValidationError si no hay personal asignado', async () => {
        bitacoraRepositoryMock.findById.mockResolvedValue({ id: 1, inspector: 'yo', turno: 'T1', estado: 'ABIERTA' });
        bitacoraRepositoryMock.getResumenProcesos.mockResolvedValue([{ id: 1, nombre: 'Proceso 1' }]);
        bitacoraRepositoryMock.getRegistrosByProceso.mockResolvedValue([{ id: 1, cantidad_producida: 10 }]);
        bitacoraRepositoryMock.getMuestrasByProceso.mockResolvedValue([]);
        bitacoraRepositoryMock.getProcesoStatus.mockResolvedValue({ no_operativo: 0 });
        bitacoraRepositoryMock.checkAssignmentsForProcess.mockResolvedValue(false);
        paroRepositoryMock.sumMinutosByBitacoraAndProceso.mockResolvedValue(0);

        await expect(bitacoraService.closeBitacora(1, 'yo', 'Inspector'))
            .rejects.toThrow(/personal asignado/);
    });

    // Nuevos tests para métodos extraídos (Problema 2)
    test('_checkCloseAuthorization permite el cierre al inspector original', () => {
        const bitacora = { inspector: 'user1' };
        expect(() => bitacoraService._checkCloseAuthorization(bitacora, 'user1', 'Operario'))
            .not.toThrow();
    });

    test('_checkCloseAuthorization permite el cierre a un Administrador aunque no sea el inspector', () => {
        const bitacora = { inspector: 'user1' };
        expect(() => bitacoraService._checkCloseAuthorization(bitacora, 'user2', 'Administrador'))
            .not.toThrow();
    });

    test('_checkCloseAuthorization permite el cierre a un Supervisor aunque no sea el inspector', () => {
        const bitacora = { inspector: 'user1' };
        expect(() => bitacoraService._checkCloseAuthorization(bitacora, 'user2', 'Supervisor'))
            .not.toThrow();
    });

    test('_checkCloseAuthorization lanza AppError para roles no autorizados que no son el inspector', () => {
        const bitacora = { inspector: 'user1' };
        expect(() => bitacoraService._checkCloseAuthorization(bitacora, 'user2', 'Operario'))
            .toThrow(AppError);
    });

    test('_checkNeedsRevision retorna true si hay rechazos', () => {
        const muestras = [{ resultado: 'Rechazo' }];
        const registros = [];
        expect(bitacoraService._checkNeedsRevision(muestras, registros)).toBe(true);
    });

    test('_checkNeedsRevision retorna true si hay incidentes en observaciones', () => {
        const muestras = [];
        const registros = [{ observaciones: 'Se detectó un incidente en la línea' }];
        expect(bitacoraService._checkNeedsRevision(muestras, registros)).toBe(true);
    });

    test('_checkNeedsRevision retorna false si no hay desviaciones', () => {
        const muestras = [{ resultado: 'Aprobado' }];
        const registros = [{ observaciones: 'Todo normal' }];
        expect(bitacoraService._checkNeedsRevision(muestras, registros)).toBe(false);
    });

    test('calcularResumenTiempo retorna valores correctos', async () => {
        bitacoraRepositoryMock.getProcesoStatus.mockResolvedValue({ tiempo_programado_minutos: 480 });
        paroRepositoryMock.sumMinutosByBitacoraAndProceso.mockResolvedValue(120);

        const resumen = await bitacoraService.calcularResumenTiempo(1, 1);
        expect(resumen).toEqual({
            tiempo_programado: 480,
            total_paros: 120,
            tiempo_efectivo: 360
        });
    });
});
