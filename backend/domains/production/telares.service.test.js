const TelaresService = require('./telares.service');
const ValidationError = require('../../shared/errors/ValidationError');
const NotFoundError = require('../../shared/errors/NotFoundError');

describe('TelaresService', () => {
    let service;
    let mockRepo, mockLineaRepo, mockRegRepo, mockMuestraRepo, mockLoteSvc, mockParoSvc, mockAuditSvc;

    beforeEach(() => {
        mockRepo = {
            getAllMaquinas: jest.fn(),
            getStatusMaquinas: jest.fn(),
            getRegistrosByBitacora: jest.fn(),
            getMuestrasByBitacora: jest.fn(),
            getDefectosVisuales: jest.fn(),
            getMuestrasByMaquina: jest.fn(),
            getUltimoAcumulado: jest.fn(),
            getBitacoraById: jest.fn(),
            getUltimoRegistroHistorico: jest.fn(),
            deleteMuestrasByMaquinaYBitacora: jest.fn(),
            deleteDefectosVisualesByMaquinaYBitacora: jest.fn(),
            saveMaquinaStatus: jest.fn(),
            saveDefectoVisual: jest.fn(),
            withTransaction: jest.fn(fn => fn())
        };
        mockLineaRepo = {
            findByOrdenAndProceso: jest.fn(),
            create: jest.fn()
        };
        mockRegRepo = {
            findByLineaYBitacoraYMaquina: jest.fn(),
            create: jest.fn(),
            update: jest.fn()
        };
        mockMuestraRepo = {
            create: jest.fn()
        };
        mockLoteSvc = {
            getConsumoTelar: jest.fn(),
            getById: jest.fn(),
            guardarConsumoTelar: jest.fn()
        };
        mockParoSvc = {
            getParosByProceso: jest.fn(),
            create: jest.fn()
        };
        mockAuditSvc = {
            logChange: jest.fn()
        };

        service = new TelaresService(
            mockRepo, mockLineaRepo, mockRegRepo, mockMuestraRepo, mockLoteSvc, mockParoSvc, mockAuditSvc
        );
    });

    describe('saveDetalle', () => {
        it('debe lanzar ValidationError si no hay producción ni paros', async () => {
            const data = {
                bitacora_id: 1,
                maquina_id: 1,
                produccion: [],
                calidad: { ancho: [], construccion: [], color: [] },
                visual: [],
                paros: []
            };
            mockRepo.getBitacoraById.mockResolvedValue({ id: 1, fecha_operativa: '2025-01-01', estado: 'ABIERTA' });
            mockRepo.getUltimoAcumulado.mockResolvedValue(0);

            await expect(service.saveDetalle(data, 'user')).rejects.toThrow(ValidationError);
        });

        it('debe permitir reset anual del contador', async () => {
            const data = {
                bitacora_id: 2,
                maquina_id: 1,
                produccion: [{ orden_id: 1, acumulado_contador: 100, desperdicio_kg: 0 }],
                calidad: { ancho: [{valor: 1, resultado: 'Cumple', indice: 1}, {valor: 1, resultado: 'Cumple', indice: 2}, {valor: 1, resultado: 'Cumple', indice: 3}, {valor: 1, resultado: 'Cumple', indice: 4}], construccion: [], color: [] },
                visual: [],
                paros: [],
                lotes_consumidos: [{ lote_id: 1 }]
            };

            // Bitácora actual es 2025, pero la apertura fue en 2024
            mockRepo.getBitacoraById.mockResolvedValue({
                id: 2,
                fecha_operativa: '2025-01-01',
                fecha_apertura: '2024-12-31T23:00:00Z',
                estado: 'ABIERTA'
            });
            // Acumulado era 5000
            mockRepo.getUltimoAcumulado.mockResolvedValue(5000);

            // Mock de fecha actual para que coincida con el año 2025
            const realDate = Date;
            global.Date = class extends realDate {
                constructor(date) {
                    if (date) return new realDate(date);
                    return new realDate('2025-01-01T08:00:00Z');
                }
                static now() {
                    return new realDate('2025-01-01T08:00:00Z').getTime();
                }
            };

            mockLoteSvc.getById.mockResolvedValue({ id: 1, estado: 'activo' });
            mockLineaRepo.findByOrdenAndProceso.mockResolvedValue({ id: 10 });

            await service.saveDetalle(data, 'user');

            // Restaurar Date
            global.Date = realDate;

            // Verificamos que se creó un registro con cantidad_producida = 100 (y no 100 - 5000)
            expect(mockRegRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                cantidad_producida: 100
            }));
        });
    });
});
