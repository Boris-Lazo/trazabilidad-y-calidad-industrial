// Controlador para tipos de procesos
const procesoTipoService = require('./procesoTipo.service');

const getAll = async (req, res, next) => {
  try {
    const procesos = await procesoTipoService.getAllActive();
    res.json(procesos);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll
};
