// Servicio para órdenes de producción
const ordenProduccionRepository = require('./ordenProduccion.repository');

const getAll = async () => {
  return await ordenProduccionRepository.findAll();
};

const getById = async (id) => {
  return await ordenProduccionRepository.findById(id);
};

const create = async (data) => {
  const id = await ordenProduccionRepository.create(data);
  return await ordenProduccionRepository.findById(id);
};

const update = async (id, data) => {
  await ordenProduccionRepository.update(id, data);
  return await ordenProduccionRepository.findById(id);
};

const remove = async (id) => {
  return await ordenProduccionRepository.remove(id);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
