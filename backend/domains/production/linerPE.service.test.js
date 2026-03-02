const LinerPEService = require('./linerPE.service');
const ValidationError = require('../../shared/errors/ValidationError');

describe('LinerPEService', () => {
    let linerPEService;
    let linerPERepositoryMock;
    let lineaEjecucionRepositoryMock;
    let registroTrabajoRepositoryMock;
    let loteServiceMock;

    beforeEach(() => {
        linerPERepositoryMock = {
            getMaquina: jest.fn(),
            getEstadoMaquina: jest.fn(),
            getUltimoRegistro: jest.fn(),
            getConsumoRollosPEByBitacora: jest.fn(),
            getMuestrasCalidadByBitacora: jest.fn(),
            findOrdenCodigo: jest.fn(),
            getOrdenById: jest.fn(),
            deleteConsumoRollosPEByBitacora: jest.fn(),
            deleteRegistrosByBitacoraYMaquina: jest.fn(),
            deleteMuestrasCalidadByBitacora: jest.fn(),
            getMaxCorrelativoLinerPEPorOrden: jest.fn(),
            saveConsumoRolloPE: jest.fn(),
            saveMuestraCalidad: jest.fn(),
            saveEstadoMaquina: jest.fn(),
            withTransaction: jest.fn(fn => fn())
        };
        lineaEjecucionRepositoryMock = {
            findByOrdenAndProceso: jest.fn(),
            create: jest.fn()
        };
        registroTrabajoRepositoryMock = {
            create: jest.fn()
        };
        loteServiceMock = {
            getByBitacoraYOrden: jest.fn(),
            getById: jest.fn(),
            crearLoteDirecto: jest.fn()
        };

        linerPEService = new LinerPEService(
            linerPERepositoryMock,
            lineaEjecucionRepositoryMock,
            registroTrabajoRepositoryMock,
            loteServiceMock
        );
    });

    describe('getDetalle', () => {
        test('debe retornar el detalle completo', async () => {
            const bitacoraId = 1;
            const maquina = { id: 7, nombre_visible: 'CONV-LI' };
            linerPERepositoryMock.getMaquina.mockResolvedValue(maquina);
            linerPERepositoryMock.getEstadoMaquina.mockResolvedValue({ estado: 'Completo' });
            linerPERepositoryMock.getUltimoRegistro.mockResolvedValue({ id: 5, orden_id: 100 });
            linerPERepositoryMock.getConsumoRollosPEByBitacora.mockResolvedValue([{ id: 1 }]);
            linerPERepositoryMock.getMuestrasCalidadByBitacora.mockResolvedValue([{ id: 3 }]);
            loteServiceMock.getByBitacoraYOrden.mockResolvedValue({ id: 50, codigo_lote: 'L-001' });

            const result = await linerPEService.getDetalle(bitacoraId);

            expect(result.maquina).toEqual(maquina);
            expect(result.estado_proceso).toBe('Completo');
            expect(result.rollos_pe_consumidos).toHaveLength(1);
            expect(result.lote_turno).toBeDefined();
        });
    });

    describe('saveDetalle - Validaciones', () => {
        test('debe lanzar ValidationError si la orden no empieza por 7', async () => {
            linerPERepositoryMock.findOrdenCodigo.mockResolvedValue('5000001');
            await expect(linerPEService.saveDetalle({ orden_id: 1 }, 'user'))
                .rejects.toThrow(/no pertenece al proceso/);
        });

        test('debe lanzar ValidationError si hay producción pero no hay rollos', async () => {
            linerPERepositoryMock.findOrdenCodigo.mockResolvedValue('7000001');
            linerPERepositoryMock.getOrdenById.mockResolvedValue({ id: 1 });
            const data = { orden_id: 1, liners_producidos: 100, rollos_pe: [] };
            await expect(linerPEService.saveDetalle(data, 'user'))
                .rejects.toThrow(/Debe declarar al menos un rollo PE/);
        });

        test('debe lanzar ValidationError si hay producción pero faltan parámetros operativos', async () => {
            linerPERepositoryMock.findOrdenCodigo.mockResolvedValue('7000001');
            linerPERepositoryMock.getOrdenById.mockResolvedValue({ id: 1 });
            loteServiceMock.getById.mockResolvedValue({ id: 20, estado: 'activo' });
            const data = {
                orden_id: 1,
                liners_producidos: 100,
                rollos_pe: [{ lote_pe_id: 20 }]
            };
            await expect(linerPEService.saveDetalle(data, 'user'))
                .rejects.toThrow(/temperatura de sellado es obligatoria/);
        });
    });

    describe('saveDetalle - Flujo Completo', () => {
        test('debe guardar el detalle y calcular estado Completo', async () => {
            linerPERepositoryMock.findOrdenCodigo.mockResolvedValue('7000001');
            linerPERepositoryMock.getOrdenById.mockResolvedValue({
                id: 1,
                especificaciones: JSON.stringify({ ancho_nominal: 20, largo_nominal: 30 })
            });
            linerPERepositoryMock.getMaquina.mockResolvedValue({ id: 7 });
            loteServiceMock.getById.mockResolvedValue({ id: 20, codigo_lote: 'PE-001', estado: 'activo' });
            loteServiceMock.getByBitacoraYOrden.mockResolvedValue(null);
            linerPERepositoryMock.getMaxCorrelativoLinerPEPorOrden.mockResolvedValue(0);

            // Mocking muestras guardadas para el cálculo de estado final
            linerPERepositoryMock.getMuestrasCalidadByBitacora.mockResolvedValue([
                { inspeccion_indice: 1, parametro: 'ancho_liner', resultado: 'Cumple' },
                { inspeccion_indice: 1, parametro: 'largo_liner', resultado: 'Cumple' },
                { inspeccion_indice: 1, parametro: 'sello_fondo', resultado: 'Cumple' },
                { inspeccion_indice: 2, parametro: 'ancho_liner', resultado: 'Cumple' },
                { inspeccion_indice: 2, parametro: 'largo_liner', resultado: 'Cumple' },
                { inspeccion_indice: 2, parametro: 'sello_fondo', resultado: 'Cumple' },
                { inspeccion_indice: 3, parametro: 'ancho_liner', resultado: 'Cumple' },
                { inspeccion_indice: 3, parametro: 'largo_liner', resultado: 'Cumple' },
                { inspeccion_indice: 3, parametro: 'sello_fondo', resultado: 'Cumple' },
                { inspeccion_indice: 4, parametro: 'ancho_liner', resultado: 'Cumple' },
                { inspeccion_indice: 4, parametro: 'largo_liner', resultado: 'Cumple' },
                { inspeccion_indice: 4, parametro: 'sello_fondo', resultado: 'Cumple' }
            ]);

            const data = {
                bitacora_id: 1,
                orden_id: 1,
                liners_producidos: 1000,
                rollos_pe: [{ lote_pe_id: 20 }],
                muestras: [
                    { inspeccion_indice: 1, parametro: 'ancho_liner', valor: 20 },
                    { inspeccion_indice: 1, parametro: 'largo_liner', valor: 30 },
                    { inspeccion_indice: 1, parametro: 'sello_fondo', resultado: 'Cumple' }
                    // ... otros se mockean en getMuestrasCalidadByBitacora
                ],
                temperatura_sellado: 180,
                velocidad_operacion: 50
            };

            const result = await linerPEService.saveDetalle(data, 'admin');

            expect(result.estado).toBe('Completo');
            expect(linerPERepositoryMock.saveConsumoRolloPE).toHaveBeenCalled();
            expect(loteServiceMock.crearLoteDirecto).toHaveBeenCalled();
        });

        test('debe calcular estado Con desviación si alguna muestra falla', async () => {
            linerPERepositoryMock.findOrdenCodigo.mockResolvedValue('7000001');
            linerPERepositoryMock.getOrdenById.mockResolvedValue({
                id: 1,
                especificaciones: JSON.stringify({ ancho_nominal: 20, largo_nominal: 30 })
            });
            linerPERepositoryMock.getMaquina.mockResolvedValue({ id: 7 });
            loteServiceMock.getById.mockResolvedValue({ id: 20, codigo_lote: 'PE-001', estado: 'activo' });

            linerPERepositoryMock.getMuestrasCalidadByBitacora.mockResolvedValue([
                { inspeccion_indice: 1, parametro: 'ancho_liner', resultado: 'No cumple' }
            ]);

            const data = {
                bitacora_id: 1,
                orden_id: 1,
                liners_producidos: 1000,
                rollos_pe: [{ lote_pe_id: 20 }],
                muestras: [{ inspeccion_indice: 1, parametro: 'ancho_liner', valor: 25 }],
                temperatura_sellado: 180,
                velocidad_operacion: 50
            };

            const result = await linerPEService.saveDetalle(data, 'admin');

            expect(result.estado).toBe('Con desviación');
        });
    });
});
