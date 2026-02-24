class GruposController {
  constructor(gruposService) {
    this.gruposService = gruposService;
  }

  async getGrupos(req, res, next) {
    try {
      const grupos = await this.gruposService.getGrupos();
      res.json({ success: true, data: grupos });
    } catch (error) {
      next(error);
    }
  }

  async createGrupo(req, res, next) {
    try {
      const data = req.body;
      const creatorId = req.user.persona_id;
      const id = await this.gruposService.createGrupo(data, creatorId);
      res.json({ success: true, data: { id, message: 'Grupo creado con éxito' } });
    } catch (error) {
      next(error);
    }
  }

  async getGrupoDetalle(req, res, next) {
    try {
      const { id } = req.params;
      const detalle = await this.gruposService.getGrupoDetalle(id);
      res.json({ success: true, data: detalle });
    } catch (error) {
      next(error);
    }
  }

  async addIntegrante(req, res, next) {
    try {
      const { id } = req.params; // grupoId
      const { personaId, motivo } = req.body;
      const assignerId = req.user.persona_id;

      await this.gruposService.addIntegrante(id, personaId, motivo, assignerId);
      res.json({ success: true, data: { message: 'Integrante añadido con éxito' } });
    } catch (error) {
      next(error);
    }
  }

  async removeIntegrante(req, res, next) {
    try {
      const { id, personaId } = req.params;
      const { motivo } = req.body;
      const assignerId = req.user.persona_id;

      await this.gruposService.removeIntegrante(id, personaId, motivo, assignerId);
      res.json({ success: true, data: { message: 'Integrante removido con éxito' } });
    } catch (error) {
      next(error);
    }
  }

  async rotarTurno(req, res, next) {
    try {
      const { id } = req.params;
      const { nuevoTurno } = req.body;
      const assignerId = req.user.persona_id;

      await this.gruposService.rotarTurno(id, nuevoTurno, assignerId);
      res.json({ success: true, data: { message: 'Turno actualizado con éxito' } });
    } catch (error) {
      next(error);
    }
  }

  async getRolesOperativos(req, res, next) {
    try {
      const roles = await this.gruposService.getRolesOperativos();
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  async assignRolOperativo(req, res, next) {
    try {
      const { personaId } = req.params;
      const { rolOperativoId, motivo } = req.body;
      const assignerId = req.user.persona_id;

      await this.gruposService.assignRolOperativo(personaId, rolOperativoId, motivo, assignerId);
      res.json({ success: true, data: { message: 'Rol operativo asignado con éxito' } });
    } catch (error) {
      next(error);
    }
  }

  async getHistorialPersona(req, res, next) {
    try {
      const { personaId } = req.params;
      const historial = await this.gruposService.getHistorialPersona(personaId);
      res.json({ success: true, data: historial });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GruposController;
