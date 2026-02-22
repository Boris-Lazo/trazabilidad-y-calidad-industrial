const { z } = require('zod');

const bitacoraSchema = {
  body: z.object({
    turno: z.enum(['T1', 'T2', 'T3']),
    fecha_operativa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    inspector: z.string().optional(),
    fuera_de_horario: z.boolean().optional()
  })
};

const ordenSchema = {
  body: z.object({
    codigo_orden: z.string().min(1),
    producto: z.string().min(1),
    cantidad_objetivo: z.number().positive(),
    unidad: z.string().min(1),
    prioridad: z.enum(['Alta', 'Media', 'Baja']).optional()
  })
};

module.exports = {
  bitacoraSchema,
  ordenSchema
};
