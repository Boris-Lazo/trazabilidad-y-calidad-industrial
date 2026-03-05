const { z } = require('zod');

const personalValidation = {
  createPersona: z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    apellido: z.string().min(1, 'El apellido es obligatorio'),
    codigo_interno: z.string().min(1, 'El código interno es obligatorio'),
    area_id: z.number().int().positive('El área es obligatoria'),
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().optional(),
    fecha_ingreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional(),
    rol_organizacional: z.string().min(1, 'El rol organizacional es obligatorio'),
  }),

  updatePersona: z.object({
    nombre: z.string().min(1).optional(),
    apellido: z.string().min(1).optional(),
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().optional(),
    area_id: z.number().int().positive().optional(),
    rol_organizacional: z.string().min(1).optional(),
    estado_laboral: z.enum(['Activo', 'Incapacitado', 'Inactivo', 'Baja']).optional(),
    ausencia_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    ausencia_hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    tipo_ausencia: z.enum(['Incapacidad', 'Permiso']).nullable().optional(),
    motivo_ausencia: z.string().nullable().optional(),
    motivo_cambio: z.string().min(5, 'El motivo del cambio debe tener al menos 5 caracteres'),
    categoria_motivo: z.string().optional(),
  }),

  assignRole: z.object({
    rol_id: z.number({ required_error: 'El rol es obligatorio' }).int().positive(),
    motivo_cambio: z.string({ required_error: 'El motivo del cambio de rol es obligatorio' }).min(5, 'El motivo del cambio de rol es obligatorio'),
    es_correccion: z.boolean().optional().default(false),
    categoria_motivo: z.string().optional(),
  }),

  assignOperation: z.object({
    proceso_id: z.number().int().positive(),
    es_correccion: z.boolean().optional().default(false),
    maquina_id: z.number().int().positive().nullable().optional(),
    turno: z.string().min(1),
    permanente: z.boolean().default(false),
    motivo_cambio: z.string().min(5).optional(),
    categoria_motivo: z.string().optional(),
  }),

  toggleAcceso: z.object({
    acceso_activo: z.boolean({
      required_error: 'acceso_activo es obligatorio'
    })
  })
};

module.exports = personalValidation;
