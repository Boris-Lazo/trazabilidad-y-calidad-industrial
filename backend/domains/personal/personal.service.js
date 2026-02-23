const bcrypt = require('bcrypt');
const ValidationError = require('../../shared/errors/ValidationError');
const { logger } = require('../../shared/logger/logger');

class PersonalService {
  constructor(personalRepository) {
    this.personalRepository = personalRepository;
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

  async updateStaff(id, data, updaterId) {
    const persona = await this.personalRepository.getPersonaById(id);
    if (!persona) throw new ValidationError('Persona no encontrada');

    return await this.personalRepository.updatePersona(id, {
      ...data,
      updated_by: updaterId
    });
  }

  async getCatalogs() {
    const areas = await this.personalRepository.getAreas();
    const roles = await this.personalRepository.getRoles();
    return { areas, roles };
  }

  async assignRole(personaId, rolId, assignerId) {
    return await this.personalRepository.assignRole(personaId, rolId, assignerId);
  }

  async assignOperation(assignmentData, creatorId) {
    return await this.personalRepository.assignOperation({
      ...assignmentData,
      created_by: creatorId
    });
  }
}

module.exports = PersonalService;
