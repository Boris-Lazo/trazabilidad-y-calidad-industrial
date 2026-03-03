const assert = require('assert');
const PlanningService = require('./planning.service');

describe('PlanningService', () => {
    let service;
    let mockRepo;
    let mockAudit;

    beforeEach(() => {
        mockRepo = {
            findPlanByWeek: async () => null,
            findPlanById: async () => ({ id: 1, estado: 'BORRADOR' }),
            createPlan: async () => 1,
            updatePlanStatus: async () => {},
            getOrderAssignments: async () => [],
            getPersonnelAssignments: async () => []
        };
        mockAudit = {
            logStatusChange: async () => {}
        };
        service = new PlanningService(mockRepo, mockAudit);
    });

    it('should calculate ISO week dates correctly', () => {
        const dates = service._getDatesForISOWeek(2025, 1);
        // Week 1 of 2025 starts on Dec 30, 2024 (Monday)
        assert.strictEqual(dates.start, '2024-12-30');
        assert.strictEqual(dates.end, '2025-01-05');
    });

    it('should calculate ISO week data from date correctly', () => {
        const data = service._getISOWeekData(new Date('2025-01-01'));
        assert.strictEqual(data.anio, 2025);
        assert.strictEqual(data.semana_iso, 1);
        assert.strictEqual(data.dia_semana, 3); // Wednesday
    });

    it('should transition to AJUSTADO when assigning to PUBLICADO plan', async () => {
        mockRepo.findPlanById = async () => ({ id: 1, estado: 'PUBLICADO' });
        let statusUpdated = false;
        mockRepo.updatePlanStatus = async (id, status) => {
            if (status === 'AJUSTADO') statusUpdated = true;
        };
        mockRepo.upsertOrderAssignment = async () => {};

        await service.assignOrder({ plan_id: 1 }, 'user');
        assert.strictEqual(statusUpdated, true);
    });

    it('should create a snapshot when publishing for the first time', async () => {
        mockRepo.findPlanById = async () => ({ id: 1, estado: 'BORRADOR' });
        mockRepo.hasBasalPlan = async () => false;
        let snapshotCreated = false;
        mockRepo.createSnapshot = async () => { snapshotCreated = true; };

        await service.publishPlan(1, 'user');
        assert.strictEqual(snapshotCreated, true);
    });

    it('should record a deviation when modifying an AJUSTADO plan with a reason', async () => {
        mockRepo.findPlanById = async () => ({ id: 1, estado: 'AJUSTADO' });
        let deviationRecorded = false;
        service.recordDeviation = async (data) => {
            if (data.tipo_desviacion === 'CAMBIO_PLAN') deviationRecorded = true;
        };
        mockRepo.upsertOrderAssignment = async () => {};

        await service.assignOrder({ plan_id: 1, motivo_id: 1, comentario: 'Test' }, 'user');
        assert.strictEqual(deviationRecorded, true);
    });
});
