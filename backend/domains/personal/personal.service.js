const bcrypt = require('bcrypt');
const ValidationError = require('../../shared/errors/ValidationError');
const { logger } = require('../../shared/logger/logger');

class PersonalService {
  constructor(personalRepository, auditService) {
    this.personalRepository = personalRepository;
    this.auditService = auditService;
  }

  async getAllStaff() {
    return await this.personalRepository.getAllPersonas();
  }

  async getStaffDetails(id) {
    const persona = await this.personalRepository.getPersonaById(id);
    if (!persona) throw new ValidationError('Persona no encontrada');

    const roleHistory = await this.personalRepository.getRoleHistory(id);
    const assignments = await this.personalRepository.getActiveAssignments(id);

    return {
      ...persona,
      historial_roles: roleHistory,
      asignaciones_activas: assignments
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

      // 4. Crear Usuario
      await this.personalRepository.createUser({
        persona_id: personaId,
        username: data.codigo_interno,
        password_hash: passwordHash,
        must_change_password: true,
        created_by: creatorId
      });

      // 5. Asignar Rol Inicial
      await this.personalRepository.assignRole(personaId, data.rol_id, creatorId);

      logger.info(`Personal registrado: ${data.codigo_interno}. Contraseña temporal enviada a ${data.email}: ${tempPassword}`);

      return {
        id: personaId,
        tempPassword // En un sistema real esto se enviaría por email solamente
      };
    });
  }

  async _checkTerminalState(personaId) {
    const user = await this.personalRepository.findUserByPersonaId(personaId);
    if (user && user.estado_usuario === 'Baja lógica') {
      throw new ValidationError('Estado terminal: No se pueden realizar cambios en un usuario con Baja lógica');
    }
  }

  async updateStaff(id, data, updaterId) {
    const persona = await this.personalRepository.getPersonaById(id);
    if (!persona) throw new ValidationError('Persona no encontrada');

    await this._checkTerminalState(id);

    await this.personalRepository.updatePersona(id, {
      ...data,
      updated_by: updaterId
    });

    // Auditoría detallada de cambio de estado o datos
    if (data.estado_laboral && data.estado_laboral !== persona.estado_laboral) {
        await this.auditService.logStatusChange(updaterId, 'Persona', id, persona.estado_laboral, data.estado_laboral, data.motivo_cambio || 'Cambio de estado laboral');
    } else {
        await this.auditService.logUpdate(updaterId, 'Persona', id, persona, data, data.motivo_cambio || 'Actualización de datos de personal');
    }

    return true;
  }

  async getCatalogs() {
    const areas = await this.personalRepository.getAreas();
    const roles = await this.personalRepository.getRoles();
    return { areas, roles };
  }

  async assignRole(personaId, rolId, assignerId, reason) {
    if (!reason) throw new ValidationError('El motivo del cambio de rol es obligatorio');

    const persona = await this.personalRepository.getPersonaById(personaId);
    if (!persona) throw new ValidationError('Persona no encontrada');

    await this._checkTerminalState(personaId);

    return await this.personalRepository.withTransaction(async () => {
      await this.personalRepository.updateUserRole(personaId, rolId, assignerId, reason);

      // Auditoría reforzada para cambio de rol
      await this.auditService.logChange({
        usuario: assignerId,
        accion: 'ROLE_CHANGE',
        entidad: 'Persona',
        entidad_id: personaId,
        valor_anterior: { rol: persona.rol_actual },
        valor_nuevo: { rol_id: rolId },
        motivo_cambio: reason
      });

      return true;
    });
  }

  async updateUserStatus(personaId, newStatus, updaterId, reason) {
    const user = await this.personalRepository.findUserByPersonaId(personaId);
    if (!user) throw new ValidationError('Usuario no encontrado');

    if (user.estado_usuario === 'Baja lógica') {
      throw new ValidationError('Estado terminal: No se pueden realizar cambios en un usuario con Baja lógica');
    }

    return await this.personalRepository.withTransaction(async () => {
      await this.personalRepository.updateUserStatus(user.id, newStatus, updaterId, reason);

      await this.auditService.logStatusChange(updaterId, 'Usuario', user.id, user.estado_usuario, newStatus, reason);

      return true;
    });
  }

  async reactivateUser(personaId, updaterId, reason) {
    const user = await this.personalRepository.findUserByPersonaId(personaId);
    if (!user) throw new ValidationError('Usuario no encontrado');

    if (user.estado_usuario === 'Baja lógica') {
      throw new ValidationError('La Baja lógica es irreversible. No se puede reactivar el usuario.');
    }

    if (user.estado_usuario === 'Activo') {
      throw new ValidationError('El usuario ya se encuentra Activo');
    }

    return await this.personalRepository.withTransaction(async () => {
      await this.personalRepository.updateUserStatus(user.id, 'Activo', updaterId, reason);

      // Auditoría reforzada para reactivación
      await this.auditService.logChange({
        usuario: updaterId,
        accion: 'REACTIVACION_USUARIO',
        entidad: 'Usuario',
        entidad_id: user.id,
        valor_anterior: { estado: user.estado_usuario },
        valor_nuevo: { estado: 'Activo' },
        motivo_cambio: reason
      });

      return true;
    });
  }

  async assignOperation(assignmentData, creatorId) {
    const user = await this.personalRepository.findUserByPersonaId(assignmentData.persona_id);

    if (!user || user.estado_usuario !== 'Activo') {
      throw new ValidationError('Asignación bloqueada: El personal no tiene un usuario en estado Activo');
    }

    return await this.personalRepository.assignOperation({
      ...assignmentData,
      created_by: creatorId
    });
  }
}

module.exports = PersonalService;
