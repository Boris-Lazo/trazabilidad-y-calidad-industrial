const { z } = require('zod');

const personalValidation = {
  createPersona: z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    apellido: z.string().min(1, 'El apellido es obligatorio'),
    codigo_interno: z.string().min(1, 'El código interno es obligatorio'),
    area_id: z.number().int().positive('El área es obligatoria'),
    email: z.string().email('Email inválido'),
    telefono: z.string().optional(),
    fecha_ingreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    tipo_personal: z.enum(['operativo', 'administrativo']),
    rol_id: z.number().int().positive('El rol es obligatorio'),
  }),

  updatePersona: z.object({
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().optional(),
    estado_laboral: z.enum(['activo', 'inactivo', 'baja_definitiva']).optional(),
    motivo_cambio: z.string().min(5, 'El motivo del cambio debe tener al menos 5 caracteres'),
  }),

  assignRole: z.object({
    rol_id: z.number().int().positive(),
  }),

  assignOperation: z.object({
    proceso_tipo_id: z.number().int().positive(),
    maquina_id: z.number().int().positive().nullable().optional(),
    turno: z.string().min(1),
    permanente: z.boolean().default(false),
  })
};

module.exports = personalValidation;
