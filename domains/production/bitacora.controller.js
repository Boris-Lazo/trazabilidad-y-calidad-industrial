
const Bitacora = require('./bitacora.model');
const { getOperationalInfo } = require('./turno.utils');

const bitacoraController = {
    getSuggestedInfo: (req, res) => {
        const info = getOperationalInfo();
        res.json(info);
    },

    getCurrent: (req, res) => {
        Bitacora.findCurrent((err, bitacora) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!bitacora) return res.status(404).json({ message: 'No hay bitácora activa' });
            res.json(bitacora);
        });
    },

    open: (req, res) => {
        const { fecha_operativa, turno, usuario_id } = req.body;
        Bitacora.create({ fecha_operativa, turno, usuario_id }, (err, id) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, message: 'Bitácora abierta con éxito' });
        });
    },

    close: (req, res) => {
        const { id } = req.params;
        const { resumen } = req.body;
        Bitacora.close(id, resumen, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Bitácora cerrada con éxito' });
        });
    },

    getStatus: (req, res) => {
        const { id } = req.params;
        Bitacora.getProcessStatus(id, (err, processes) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(processes);
        });
    },

    getStats: (req, res) => {
        const { id } = req.params;
        Bitacora.getSummaryStats(id, (err, stats) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(stats);
        });
    }
};

module.exports = bitacoraController;
