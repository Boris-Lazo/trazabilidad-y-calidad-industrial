// Validaciones para el dominio Auth usando Zod
const { z } = require('zod');

const loginSchema = {
  body: z.object({
    username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
    password: z.string().min(5, 'La contraseña debe tener al menos 5 caracteres')
  })
};

module.exports = {
  loginSchema
};
