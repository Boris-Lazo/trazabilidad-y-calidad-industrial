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
    nombre: z.string().min(1).optional(),
    apellido: z.string().min(1).optional(),
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().optional(),
    estado_laboral: z.enum(['Activo', 'Inactivo', 'Baja']).optional(),
    motivo_cambio: z.string().min(5, 'El motivo del cambio debe tener al menos 5 caracteres'),
  }),

  updateStatus: z.object({
    estado_usuario: z.enum(['Activo', 'Suspendido', 'Bloqueado', 'Baja lógica'], {
        error_map: () => ({ message: 'Estado de usuario inválido' })
    }),
    motivo_cambio: z.string({ required_error: 'El motivo del cambio es obligatorio' }).min(5, 'El motivo del cambio debe ser descriptivo (min 5 caracteres)'),
  }),

  reactivateUser: z.object({
    motivo_cambio: z.string({ required_error: 'El motivo de reactivación es obligatorio' }).min(5, 'El motivo de reactivación es obligatorio'),
  }),

  assignRole: z.object({
    rol_id: z.number({ required_error: 'El rol es obligatorio' }).int().positive(),
    motivo_cambio: z.string({ required_error: 'El motivo del cambio de rol es obligatorio' }).min(5, 'El motivo del cambio de rol es obligatorio'),
    es_correccion: z.boolean().optional().default(false),
  }),

  assignOperation: z.object({
    proceso_tipo_id: z.number().int().positive(),
    es_correccion: z.boolean().optional().default(false),
    maquina_id: z.number().int().positive().nullable().optional(),
    turno: z.string().min(1),
    permanente: z.boolean().default(false),
  })
};

module.exports = personalValidation;
