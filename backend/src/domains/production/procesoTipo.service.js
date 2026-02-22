// Servicio para tipos de procesos
const procesoTipoRepository = require('./procesoTipo.repository');

const getAllActive = async () => {
  return await procesoTipoRepository.findAll();
};

const getById = async (id) => {
  return await procesoTipoRepository.findById(id);
};

module.exports = {
  getAllActive,
  getById
};
