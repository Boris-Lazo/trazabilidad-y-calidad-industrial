const VestidosService = require('./vestidos.service');
const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

describe('VestidosService', () => {
    let vestidosService;
    let vestidosRepositoryMock;
    let lineaEjecucionRepositoryMock;
    let registroTrabajoRepositoryMock;
    let loteServiceMock;

    beforeEach(() => {
        vestidosRepositoryMock = {
            getMaquina: jest.fn(),
            getEstadoMaquina: jest.fn(),
            getUltimoRegistro: jest.fn(),
            getConsumoRollosSacoByBitacora: jest.fn(),
            getConsumoRollosPEByBitacora: jest.fn(),
            getMuestrasCalidadByBitacora: jest.fn(),
            getMuestraFisicaByOrdenYBitacora: jest.fn(),
            getDefectosByBitacora: jest.fn(),
            findOrdenCodigo: jest.fn(),
            getOrdenById: jest.fn(),
            deleteConsumoRollosSacoByBitacora: jest.fn(),
            deleteConsumoRollosPEByBitacora: jest.fn(),
            deleteRegistrosByBitacoraYMaquina: jest.fn(),
            deleteMuestrasCalidadByBitacora: jest.fn(),
            deleteMuestraFisicaByBitacora: jest.fn(),
            deleteDefectosByBitacora: jest.fn(),
            getMaxCorrelativoVestidosPorOrden: jest.fn(),
            findLoteExistentePorRolloSaco: jest.fn(),
            saveConsumoRolloSaco: jest.fn(),
            saveConsumoRolloPE: jest.fn(),
            saveMuestraCalidad: jest.fn(),
            saveMuestraFisica: jest.fn(),
            saveDefecto: jest.fn(),
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
            getById: jest.fn(),
            crearLoteDirecto: jest.fn()
        };

        vestidosService = new VestidosService(
            vestidosRepositoryMock,
            lineaEjecucionRepositoryMock,
            registroTrabajoRepositoryMock,
            loteServiceMock
        );
    });

    describe('getDetalle', () => {
        test('debe retornar el detalle completo', async () => {
            const bitacoraId = 1;
            const maquina = { id: 10, nombre_visible: 'CONV#03' };
            vestidosRepositoryMock.getMaquina.mockResolvedValue(maquina);
            vestidosRepositoryMock.getEstadoMaquina.mockResolvedValue({ estado: 'Completo' });
            vestidosRepositoryMock.getUltimoRegistro.mockResolvedValue({ id: 5, orden_id: 100 });
            vestidosRepositoryMock.getConsumoRollosSacoByBitacora.mockResolvedValue([{ id: 1 }]);
            vestidosRepositoryMock.getConsumoRollosPEByBitacora.mockResolvedValue([{ id: 2 }]);
            vestidosRepositoryMock.getMuestrasCalidadByBitacora.mockResolvedValue([{ id: 3 }]);
            vestidosRepositoryMock.getMuestraFisicaByOrdenYBitacora.mockResolvedValue({ id: 4 });
            vestidosRepositoryMock.getDefectosByBitacora.mockResolvedValue([]);

            const result = await vestidosService.getDetalle(bitacoraId);

            expect(result.maquina).toEqual(maquina);
            expect(result.estado_proceso).toBe('Completo');
            expect(result.rollos_saco).toHaveLength(1);
            expect(result.rollos_pe).toHaveLength(1);
        });
    });

    describe('saveDetalle - Validaciones', () => {
        test('debe lanzar ValidationError si la orden no existe', async () => {
            vestidosRepositoryMock.findOrdenCodigo.mockResolvedValue(null);
            await expect(vestidosService.saveDetalle({ orden_id: 999 }, 'user'))
                .rejects.toThrow(ValidationError);
        });

        test('debe lanzar ValidationError si la orden no empieza por 9', async () => {
            vestidosRepositoryMock.findOrdenCodigo.mockResolvedValue('5000001');
            await expect(vestidosService.saveDetalle({ orden_id: 1 }, 'user'))
                .rejects.toThrow(/no pertenece al proceso/);
        });

        test('debe lanzar ValidationError si tiene fuelle o microperforado', async () => {
            vestidosRepositoryMock.findOrdenCodigo.mockResolvedValue('9000001');
            vestidosRepositoryMock.getOrdenById.mockResolvedValue({
                especificaciones: JSON.stringify({ con_fuelle: true })
            });
            vestidosRepositoryMock.getMaquina.mockResolvedValue({ id: 10 });

            await expect(vestidosService.saveDetalle({ orden_id: 1 }, 'user'))
                .rejects.toThrow(/no puede procesar sacos con fuelle/);
        });

        test('debe lanzar ValidationError si el lote PE está cerrado', async () => {
            vestidosRepositoryMock.findOrdenCodigo.mockResolvedValue('9000001');
            vestidosRepositoryMock.getOrdenById.mockResolvedValue({ especificaciones: '{}' });
            vestidosRepositoryMock.getMaquina.mockResolvedValue({ id: 10 });
            loteServiceMock.getById.mockResolvedValue({ id: 20, codigo_lote: 'PE-001', estado: 'cerrado' });

            const data = {
                orden_id: 1,
                rollos_pe: [{ lote_pe_id: 20 }]
            };

            await expect(vestidosService.saveDetalle(data, 'user'))
                .rejects.toThrow(/está cerrado/);
        });
    });

    describe('saveDetalle - Flujo Completo', () => {
        test('debe guardar el detalle correctamente', async () => {
            vestidosRepositoryMock.findOrdenCodigo.mockResolvedValue('9000001');
            vestidosRepositoryMock.getOrdenById.mockResolvedValue({
                id: 1,
                especificaciones: JSON.stringify({ ancho_saco: 20, largo_saco: 30, doble_costura: 0.5 })
            });
            vestidosRepositoryMock.getMaquina.mockResolvedValue({ id: 10 });
            vestidosRepositoryMock.getMaxCorrelativoVestidosPorOrden.mockResolvedValue(0);
            vestidosRepositoryMock.findLoteExistentePorRolloSaco.mockResolvedValue(null);
            loteServiceMock.getById.mockResolvedValue({ id: 20, codigo_lote: 'PE-001', estado: 'activo' });
            loteServiceMock.crearLoteDirecto.mockResolvedValue(100);
            registroTrabajoRepositoryMock.create.mockResolvedValue(500);
            lineaEjecucionRepositoryMock.findByOrdenAndProceso.mockResolvedValue({ id: 1000 });
            vestidosRepositoryMock.getMuestrasCalidadByBitacora.mockResolvedValue([]);

            const data = {
                bitacora_id: 1,
                orden_id: 1,
                rollos_saco: [{ codigo_rollo: 'R1', sacos_producidos: 100 }],
                rollos_pe: [{ lote_pe_id: 20 }],
                muestras: [
                    { inspeccion_indice: 1, parametro: 'ancho_saco', valor: 20 },
                    { inspeccion_indice: 1, parametro: 'largo_saco', valor: 30 },
                    { inspeccion_indice: 1, parametro: 'doble_costura', valor: 0.5 },
                    { inspeccion_indice: 1, parametro: 'puntadas_costura', valor: 13 },
                    { inspeccion_indice: 1, parametro: 'sello_liner', resultado: 'Cumple' }
                ],
                desperdicio_kg: 5,
                destino_desperdicio: 'Peletizado',
                observaciones: 'Test'
            };

            const result = await vestidosService.saveDetalle(data, 'admin');

            expect(result.registro_id).toBe(500);
            expect(vestidosRepositoryMock.saveConsumoRolloSaco).toHaveBeenCalled();
            expect(vestidosRepositoryMock.saveConsumoRolloPE).toHaveBeenCalled();
            expect(vestidosRepositoryMock.saveMuestraCalidad).toHaveBeenCalledTimes(5);
        });
    });
});
