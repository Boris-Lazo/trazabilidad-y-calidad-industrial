const ValidationError = require('../../shared/errors/ValidationError');

class GruposService {
  constructor(gruposRepository, personalRepository, auditService) {
    this.gruposRepository = gruposRepository;
    this.personalRepository = personalRepository;
    this.auditService = auditService;
  }

  async getGrupos() {
    return await this.gruposRepository.getAllGrupos();
  }

  async createGrupo(data, creatorId) {
    if (!data.nombre || !data.tipo) {
      throw new ValidationError('El nombre y el tipo de grupo son obligatorios');
    }

    return await this.gruposRepository.withTransaction(async () => {
      const grupoId = await this.gruposRepository.createGrupo(data);

      await this.auditService.logChange({
        usuario: creatorId,
        accion: 'GRUPO_CREATE',
        entidad: 'Grupo',
        entidad_id: grupoId,
        valor_nuevo: data,
        motivo_cambio: 'Creación de nuevo grupo'
      });

      return grupoId;
    });
  }

  async getGrupoDetalle(id) {
    const grupo = await this.gruposRepository.getGrupoById(id);
    if (!grupo) throw new ValidationError('Grupo no encontrado');
    const integrantes = await this.gruposRepository.getIntegrantesByGrupo(id);
    const historial = await this.gruposRepository.getHistorialIntegrantesByGrupo(id);
    return { ...grupo, integrantes, historial };
  }

  async addIntegrante(grupoId, personaId, motivo, assignerId) {
    if (!motivo) throw new ValidationError('El motivo de la asignación es obligatorio');

    const grupo = await this.gruposRepository.getGrupoById(grupoId);
    if (!grupo) throw new ValidationError('Grupo no encontrado');

    const persona = await this.personalRepository.getPersonaById(personaId);
    if (!persona) throw new ValidationError('Persona no encontrada');

    // Validar estado terminal
    const user = await this.personalRepository.findUserByPersonaId(personaId);
    if (user && user.estado_usuario === 'Baja lógica') {
        throw new ValidationError('No se puede asignar a un colaborador con Baja lógica');
    }

    // Regla: Administrativos no en grupos operativos, y viceversa
    if (grupo.tipo === 'operativo' && persona.tipo_personal === 'administrativo') {
      throw new ValidationError('Un colaborador administrativo no puede pertenecer a un grupo operativo');
    }
    if (grupo.tipo === 'administrativo' && persona.tipo_personal === 'operativo') {
      throw new ValidationError('Un colaborador operativo no puede pertenecer al grupo administrativo');
    }

    // Verificar si ya está en el grupo
    const actuales = await this.gruposRepository.getIntegrantesByGrupo(grupoId);
    if (actuales.find(i => i.persona_id === parseInt(personaId))) {
      throw new ValidationError('El colaborador ya pertenece a este grupo');
    }

    return await this.gruposRepository.withTransaction(async () => {
      await this.gruposRepository.addIntegrante({
        grupo_id: grupoId,
        persona_id: personaId,
        motivo,
        asignado_por: assignerId
      });

      await this.auditService.logChange({
        usuario: assignerId,
        accion: 'GRUPO_ADD_INTEGRANTE',
        entidad: 'Grupo',
        entidad_id: grupoId,
        valor_nuevo: {
          persona_id: personaId,
          colaborador: `${persona.nombre} ${persona.apellido}`,
          grupo: grupo.nombre,
          tipo_grupo: grupo.tipo
        },
        motivo_cambio: motivo
      });

      return true;
    });
  }

  async removeIntegrante(grupoId, personaId, motivo, assignerId) {
    if (!motivo) throw new ValidationError('El motivo de la remoción es obligatorio');

    const grupo = await this.gruposRepository.getGrupoById(grupoId);
    if (!grupo) throw new ValidationError('Grupo no encontrado');

    // Validar membresía activa
    const actuales = await this.gruposRepository.getIntegrantesByGrupo(grupoId);
    const esMiembro = actuales.find(i => i.persona_id === parseInt(personaId));
    if (!esMiembro) {
      throw new ValidationError('El colaborador no pertenece a este grupo');
    }

    return await this.gruposRepository.withTransaction(async () => {
      await this.gruposRepository.removeIntegrante(grupoId, personaId);

      const persona = await this.personalRepository.getPersonaById(personaId);
      await this.auditService.logChange({
        usuario: assignerId,
        accion: 'GRUPO_REMOVE_INTEGRANTE',
        entidad: 'Grupo',
        entidad_id: grupoId,
        valor_anterior: {
          persona_id: personaId,
          colaborador: persona ? `${persona.nombre} ${persona.apellido}` : 'Desconocido',
          grupo: grupo.nombre
        },
        motivo_cambio: motivo
      });

      return true;
    });
  }

  async rotarTurno(grupoId, nuevoTurno, assignerId) {
    const grupo = await this.gruposRepository.getGrupoById(grupoId);
    if (!grupo) throw new ValidationError('Grupo no encontrado');

    if (grupo.tipo === 'administrativo') {
      throw new ValidationError('El turno del grupo administrativo es fijo (T4)');
    }

    const anteriorTurno = grupo.turno_actual;
    return await this.gruposRepository.withTransaction(async () => {
      await this.gruposRepository.updateTurnoGrupo(grupoId, nuevoTurno);

      await this.auditService.logChange({
        usuario: assignerId,
        accion: 'GRUPO_ROTAR_TURNO',
        entidad: 'Grupo',
        entidad_id: grupoId,
        valor_anterior: { turno: anteriorTurno },
        valor_nuevo: { turno: nuevoTurno },
        motivo_cambio: 'Rotación programada de turno'
      });

      return true;
    });
  }

  async getRolesOperativos() {
    return await this.gruposRepository.getRolesOperativos();
  }

  async assignRolOperativo(personaId, rolOperativoId, motivo, assignerId) {
    if (!motivo) throw new ValidationError('El motivo del cambio de rol es obligatorio');

    const roles = await this.gruposRepository.getRolesOperativos();
    const rol = roles.find(r => r.id === parseInt(rolOperativoId));
    if (!rol) throw new ValidationError('Rol operativo no encontrado');

    return await this.gruposRepository.withTransaction(async () => {
      await this.gruposRepository.assignRolOperativo({
        persona_id: personaId,
        rol_operativo_id: rolOperativoId,
        motivo,
        asignado_por: assignerId
      });

      await this.auditService.logChange({
        usuario: assignerId,
        accion: 'ROL_OPERATIVO_CHANGE',
        entidad: 'Persona',
        entidad_id: personaId,
        valor_nuevo: { rol_operativo: rol.nombre },
        motivo_cambio: motivo
      });

      return true;
    });
  }

  async getHistorialPersona(personaId) {
    const historialRoles = await this.gruposRepository.getPersonaRolesOperativos(personaId);
    return { historial_roles_operativos: historialRoles };
  }
}

module.exports = GruposService;
