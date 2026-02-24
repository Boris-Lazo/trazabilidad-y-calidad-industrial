const personalValidation = require('./personal.validation');
const ValidationError = require('../../shared/errors/ValidationError');

class PersonalController {
  constructor(personalService) {
    this.personalService = personalService;
  }

  async getAllStaff(req, res, next) {
    try {
      const staff = await this.personalService.getAllStaff();
      res.json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  }

  async getStaffDetails(req, res, next) {
    try {
      const details = await this.personalService.getStaffDetails(req.params.id);
      res.json({ success: true, data: details });
    } catch (error) {
      next(error);
    }
  }

  async registerStaff(req, res, next) {
    try {
      const validatedData = personalValidation.createPersona.parse(req.body);
      const result = await this.personalService.registerStaff(validatedData, req.user.id);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Personal registrado correctamente. Se ha generado una contraseña temporal.'
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        const message = error.errors.map(e => e.message).join('. ');
        return next(new ValidationError(message));
      }
      next(error);
    }
  }

  async updateStaff(req, res, next) {
    try {
      const validatedData = personalValidation.updatePersona.parse(req.body);
      await this.personalService.updateStaff(req.params.id, validatedData, req.user.id);
      res.json({ success: true, message: 'Personal actualizado correctamente.' });
    } catch (error) {
      if (error.name === 'ZodError') {
        const message = error.errors.map(e => e.message).join('. ');
        return next(new ValidationError(message));
      }
      next(error);
    }
  }

  async getCatalogs(req, res, next) {
    try {
      const catalogs = await this.personalService.getCatalogs();
      res.json({ success: true, data: catalogs });
    } catch (error) {
      next(error);
    }
  }

  async assignRole(req, res, next) {
    try {
      const { rol_id, motivo_cambio } = personalValidation.assignRole.parse(req.body);
      await this.personalService.assignRole(req.params.id, rol_id, req.user.id, motivo_cambio);
      res.json({ success: true, message: 'Rol asignado correctamente.' });
    } catch (error) {
      if (error.name === 'ZodError') {
        const message = error.errors.map(e => e.message).join('. ');
        return next(new ValidationError(message));
      }
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { estado_usuario, motivo_cambio } = personalValidation.updateStatus.parse(req.body);
      await this.personalService.updateUserStatus(req.params.id, estado_usuario, req.user.id, motivo_cambio);
      res.json({ success: true, message: `Estado de usuario actualizado a ${estado_usuario}.` });
    } catch (error) {
      if (error.name === 'ZodError') {
        const message = error.errors.map(e => e.message).join('. ');
        return next(new ValidationError(message));
      }
      next(error);
    }
  }

  async reactivateUser(req, res, next) {
    try {
      const { motivo_cambio } = personalValidation.reactivateUser.parse(req.body);
      await this.personalService.reactivateUser(req.params.id, req.user.id, motivo_cambio);
      res.json({ success: true, message: 'Usuario reactivado correctamente.' });
    } catch (error) {
      if (error.name === 'ZodError') {
        const message = error.errors.map(e => e.message).join('. ');
        return next(new ValidationError(message));
      }
      next(error);
    }
  }

  async assignOperation(req, res, next) {
    try {
      const validatedData = personalValidation.assignOperation.parse(req.body);
      await this.personalService.assignOperation({
        ...validatedData,
        persona_id: req.params.id
      }, req.user.id);
      res.json({ success: true, message: 'Asignación operativa registrada correctamente.' });
    } catch (error) {
      if (error.name === 'ZodError') {
        const message = error.errors.map(e => e.message).join('. ');
        return next(new ValidationError(message));
      }
      next(error);
    }
  }
}

module.exports = PersonalController;
