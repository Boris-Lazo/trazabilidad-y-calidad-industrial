// Servicio para lógica de negocio de autenticación
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { JWT_SECRET } = require('../../config/env');
const AppError = require('../../shared/errors/AppError');

const login = async (username, password) => {
  const user = await authRepository.findByUsername(username);

  if (!user) {
    throw new AppError('Usuario inexistente o credenciales incorrectas.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError('Credenciales incorrectas.', 401);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, rol: user.rol, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      rol: user.rol,
      nombre: user.nombre
    }
  };
};

module.exports = {
  login
};
