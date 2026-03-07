const bcrypt = require('bcrypt');
const ValidationError = require('../../shared/errors/ValidationError');
const { logger } = require('../../shared/logger/logger');

class PersonalService {
  constructor(personalRepository, auditService) {
    this.personalRepository = personalRepository;
    this.auditService = auditService;
  }

  _enrichEstado(persona) {
    if (!persona) return persona;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let estado_efectivo = persona.estado_laboral;
    let ausencia_vencida = false;

    if (['Incapacitado', 'Inactivo'].includes(persona.estado_laboral) && persona.ausencia_hasta) {
      const hasta = new Date(persona.ausencia_hasta);
      const hastaTrunc = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());

      if (hastaTrunc < today) {
        estado_efectivo = 'Activo';
        ausencia_vencida = true;
      }
    }

    return {
      ...persona,
      estado_efectivo,
      ausencia_vencida
    };
  }

  async getAllStaff() {
    const staff = await this.personalRepository.getAllPersonas();
    const enriched = staff.map(p => this._enrichEstado(p));

    // Auto-actualizar en BD los que vencieron
    const vencidos = enriched.filter(p => p.ausencia_vencida);
    for (const p of vencidos) {
      try {
        await this.personalRepository.updatePersona(p.id, {
          estado_laboral: 'Activo',
          ausencia_desde: null,
          ausencia_hasta: null,
          tipo_ausencia: null,
          motivo_ausencia: null,
          updated_by: 'SYSTEM_AUTO',
          motivo_cambio: `Retorno automático por vencimiento de ausencia (hasta: ${p.ausencia_hasta})`
        });
        logger.info(`Persona ${p.id} (${p.nombre} ${p.apellido}): estado actualizado automáticamente a Activo por vencimiento de ausencia`);
      } catch (err) {
        logger.error(`Error al actualizar estado automático de persona ${p.id}:`, err.message);
      }
    }

    return enriched;
  }

  async getStaffDetails(id) {
    let persona = await this.personalRepository.getPersonaById(id);
    if (!persona) throw new ValidationError('Persona no encontrada');
    persona = this._enrichEstado(persona);

    const roleHistory = await this.personalRepository.getRoleHistory(id);
    const assignments = await this.personalRepository.getActiveAssignments(id);
    const opRole = await this.personalRepository.getOperationalRole(id);
    const groupHistory = await this.personalRepository.getGroupHistory(id);
    const historialAusencias = await this.personalRepository.getHistorialAusenciasByPersona(id);

    const ProcessRegistry = require('../production/processes/contracts/ProcessRegistry');
    const enrichedAssignments = assignments.map(a => {
        try {
            const contract = ProcessRegistry.get(a.proceso_id);
            return { ...a, proceso_nombre: contract.nombre };
        } catch (e) {
            return { ...a, proceso_nombre: 'Desconocido' };
        }
    });

    return {
      ...persona,
      historial_roles: roleHistory,
      asignaciones_activas: enrichedAssignments,
      rol_operativo_actual: opRole,
      historial_grupos: groupHistory,
      historial_ausencias: historialAusencias
    };
  }

  async registerStaff(data, creatorId) {
    // 1. Validar unicidad
    const existingCodigo = await this.personalRepository.findByCodigoInterno(data.codigo_interno);
    if (existingCodigo) throw new ValidationError('El código interno ya está registrado');

    const existingEmail = await this.personalRepository.findByEmail(data.email);
    if (existingEmail) throw new ValidationError('El email ya está registrado');

    // 2. Generar contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    return await this.personalRepository.withTransaction(async () => {
      // 3. Crear Persona
      const personaId = await this.personalRepository.createPersona({
        ...data,
        created_by: creatorId
      });

      // 4. Determinar rol de sistema inicial (Default: Operario para nuevos colaboradores de planta/base)
      // En esta etapa no se mapean roles dinámicamente según el área para evitar acoplamiento prematuro.
      const roles = await this.personalRepository.getRoles();
      const defaultRol = roles.find(r => r.nombre === 'Operario') || roles[0];

      // 5. Crear Usuario (Agregado principal de acceso)
      await this.personalRepository.createUser({
        persona_id: personaId,
        username: data.codigo_interno,
        password_hash: passwordHash,
        rol_id: defaultRol ? defaultRol.id : null,
        must_change_password: true,
        created_by: creatorId,
        motivo_cambio: 'Registro inicial de personal y usuario'
      });

      logger.info(`Personal registrado: ${data.codigo_interno}. Contraseña temporal generada para ${data.email}.`);
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(`[DEV ONLY] Contraseña temporal para ${data.codigo_interno}: ${tempPassword}`);
      }

      return {
        id: personaId,
        tempPassword // En un sistema real esto se enviaría por email solamente
      };
    });
  }

  async updateStaff(id, data, updaterId) {
    const persona = await this.personalRepository.getPersonaById(id);
    if (!persona) throw new ValidationError('Persona no encontrada');

    if (persona.estado_laboral === 'Baja') {
      throw new ValidationError('Estado terminal: No se pueden realizar cambios en un colaborador dado de Baja');
    }

    const updatePayload = { ...data, updated_by: updaterId };

    // Validaciones de negocio para ausencias
    if (data.estado_laboral === 'Incapacitado' || data.estado_laboral === 'Inactivo') {
      if (!data.ausencia_desde) throw new ValidationError('La fecha de inicio de ausencia es obligatoria');
      if (!data.ausencia_hasta) throw new ValidationError('La fecha de fin de ausencia es obligatoria');
      if (!data.tipo_ausencia) throw new ValidationError('El tipo de ausencia es obligatorio');
      if (!data.motivo_ausencia || data.motivo_ausencia.length < 5) throw new ValidationError('El motivo de ausencia es obligatorio (min 5 caracteres)');

      if (data.estado_laboral === 'Incapacitado' && data.tipo_ausencia !== 'Incapacidad') {
        throw new ValidationError("Tipo de ausencia debe ser 'Incapacidad' para estado 'Incapacitado'");
      }
      if (data.estado_laboral === 'Inactivo' && data.tipo_ausencia !== 'Permiso') {
        throw new ValidationError("Tipo de ausencia debe ser 'Permiso' para estado 'Inactivo'");
      }
    } else if (data.estado_laboral === 'Baja') {
      if (!data.ausencia_desde) throw new ValidationError('La fecha de baja (ausencia_desde) es obligatoria');
      if (!data.motivo_ausencia || data.motivo_ausencia.length < 5) throw new ValidationError('El motivo de baja es obligatorio');
      updatePayload.tipo_ausencia = null;
      updatePayload.ausencia_hasta = null;
    } else if (data.estado_laboral === 'Activo') {
      updatePayload.ausencia_desde = null;
      updatePayload.ausencia_hasta = null;
      updatePayload.tipo_ausencia = null;
      updatePayload.motivo_ausencia = null;
    }

    await this.personalRepository.updatePersona(id, updatePayload);

    if (data.estado_laboral && data.estado_laboral !== 'Activo' && data.estado_laboral !== persona.estado_laboral) {
      await this.personalRepository.saveHistorialAusencia({
        persona_id:      id,
        estado_laboral:  data.estado_laboral,
        tipo_ausencia:   data.tipo_ausencia || null,
        ausencia_desde:  data.ausencia_desde,
        ausencia_hasta:  data.ausencia_hasta || null,
        motivo_ausencia: data.motivo_ausencia || null,
        registrado_por:  updaterId
      });
    }

    // Auditoría detallada de cambio de estado o datos
    if (data.estado_laboral && data.estado_laboral !== persona.estado_laboral) {
        await this.auditService.logStatusChange(updaterId, 'Persona', id, persona.estado_laboral, data.estado_laboral, data.motivo_cambio || 'Cambio de estado laboral', data.categoria_motivo);
    } else {
        await this.auditService.logUpdate(updaterId, 'Persona', id, persona, data, data.motivo_cambio || 'Actualización de datos de personal', data.categoria_motivo);
    }

    return true;
  }

  async toggleAcceso(personaId, accesoActivo, updaterId) {
    const persona = await this.personalRepository.getPersonaById(personaId);
    if (!persona) throw new ValidationError('Colaborador no encontrado');

    if (persona.estado_laboral === 'Baja') {
      throw new ValidationError('No se puede modificar acceso de un colaborador dado de Baja');
    }

    const usuario = await this.personalRepository.findUserByPersonaId(personaId);
    if (!usuario) throw new ValidationError('Este colaborador no tiene cuenta de acceso');

    if (persona.area_nombre !== 'Producción') {
      throw new ValidationError('El control de acceso por toggle solo aplica a personal de Producción');
    }

    await this.personalRepository.updateAccesoUsuario(personaId, accesoActivo, updaterId);

    await this.auditService.logChange({
      accion: 'TOGGLE_ACCESO',
      entidad: 'Usuario',
      entidad_id: usuario.id,
      realizado_por: updaterId,
      usuario: updaterId,
      valor_anterior: JSON.stringify({
        estado_usuario: usuario.estado_usuario }),
      valor_nuevo: JSON.stringify({
        estado_usuario: accesoActivo ? 'Activo' : 'Inactivo' }),
      motivo_cambio: accesoActivo
        ? 'Activación de acceso al sistema'
        : 'Desactivación de acceso al sistema'
    });

    return { acceso_activo: accesoActivo };
  }

  async getCatalogs() {
    const areas = await this.personalRepository.getAreas();
    const roles = await this.personalRepository.getRoles();
    return { areas, roles };
  }

  async assignRole(personaId, rolId, assignerId, reason, es_correccion = false, categoria_motivo = null) {
    if (!reason) throw new ValidationError('El motivo del cambio de rol es obligatorio');
    const finalReason = es_correccion ? `[CORRECCIÓN] ${reason}` : reason;

    const persona = await this.personalRepository.getPersonaById(personaId);
    if (!persona) throw new ValidationError('Persona no encontrada');

    if (persona.estado_laboral === 'Baja') {
      throw new ValidationError('Estado terminal: No se pueden realizar cambios en un colaborador dado de Baja');
    }

    return await this.personalRepository.withTransaction(async () => {
      await this.personalRepository.updateUserRole(personaId, rolId, assignerId, finalReason);

      // Auditoría reforzada para cambio de rol
      await this.auditService.logChange({
        usuario: assignerId,
        accion: 'ROLE_CHANGE',
        entidad: 'Persona',
        entidad_id: personaId,
        valor_anterior: { rol: persona.rol_actual },
        valor_nuevo: { rol_id: rolId },
        motivo_cambio: finalReason,
        es_correccion,
        categoria_motivo
      });

      return true;
    });
  }

  async resetPassword(personaId, updaterId) {
    const persona = await this.personalRepository.getPersonaById(personaId);
    if (!persona) throw new ValidationError('Persona no encontrada');

    const user = await this.personalRepository.findUserByPersonaId(personaId);
    if (!user) throw new ValidationError('La persona no tiene un usuario asociado');

    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.personalRepository.resetPassword(personaId, passwordHash, updaterId);

    await this.auditService.logChange({
      usuario: updaterId,
      accion: 'PASSWORD_RESET',
      entidad: 'Usuario',
      entidad_id: user.id,
      motivo_cambio: 'Reset de contraseña por administrador'
    });

    return { tempPassword };
  }

  async assignOperation(assignmentData, creatorId) {
    const personaId = assignmentData.persona_id;

    const persona = await this.personalRepository.getPersonaById(personaId);
    if (!persona) throw new ValidationError('Persona no encontrada');

    if (persona.estado_laboral !== 'Activo') {
      throw new ValidationError(`Asignación bloqueada: El colaborador se encuentra en estado ${persona.estado_laboral}. Solo colaboradores en estado Activo pueden participar en la operación.`);
    }

    // Un usuario debe estar Activo para ser asignado a operaciones
    const user = await this.personalRepository.findUserByPersonaId(personaId);
    if (!user) {
      throw new ValidationError('Asignación bloqueada: No se encontró un usuario asociado a esta persona');
    }

    // Validación de Máquina (si aplica)
    if (assignmentData.maquina_id) {
        const maquina = await this.personalRepository.db.get("SELECT * FROM MAQUINAS WHERE id = ?", [assignmentData.maquina_id]);
        if (!maquina) throw new ValidationError('La máquina seleccionada no existe');
        if (maquina.estado_actual === 'Baja' || maquina.estado_actual === 'Fuera de servicio') {
            throw new ValidationError(`Asignación bloqueada: La máquina ${maquina.nombre_visible} se encuentra en estado ${maquina.estado_actual}.`);
        }
    }

    // El admin técnico no tiene Persona, por lo que no llegará aquí vía persona_id,
    // pero reforzamos la validación de seguridad
    if (user.username === 'admin') {
      throw new ValidationError('Excepción Técnica: El usuario administrador no puede participar en operaciones.');
    }

    const finalMotivo = assignmentData.es_correccion
        ? `[CORRECCIÓN] ${assignmentData.motivo_cambio || 'Corrección de asignación'}`
        : (assignmentData.motivo_cambio || 'Asignación operativa regular');

    const result = await this.personalRepository.withTransaction(async () => {
      return await this.personalRepository.assignOperation({
        ...assignmentData,
        proceso_id: assignmentData.proceso_id,
        motivo_cambio: finalMotivo,
        created_by: creatorId
      });
    });

    await this.auditService.logChange({
        usuario: creatorId,
        accion: 'OPERATIONAL_ASSIGNMENT',
        entidad: 'Persona',
        entidad_id: assignmentData.persona_id,
        valor_nuevo: {
            proceso_id: assignmentData.proceso_id,
            maquina_id: assignmentData.maquina_id,
            turno: assignmentData.turno
        },
        motivo_cambio: finalMotivo,
        es_correccion: assignmentData.es_correccion
    });

    return result;
  }

  async getRolesOperativos() {
    return await this.personalRepository.getRolesOperativos();
  }
}

module.exports = PersonalService;