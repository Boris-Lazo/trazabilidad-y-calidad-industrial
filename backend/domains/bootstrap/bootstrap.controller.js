const { sendSuccess } = require('../../shared/response/responseHandler');

class BootstrapController {
  /**
   * @param {BootstrapService} bootstrapService
   */
  constructor(bootstrapService) {
    this.bootstrapService = bootstrapService;
  }

  getStatus = async (req, res, next) => {
    try {
      const status = await this.bootstrapService.getStatus();
      return sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  };

  getInitData = async (req, res, next) => {
    try {
      const data = await this.bootstrapService.getInitializationData();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  };

  initialize = async (req, res, next) => {
    try {
      const result = await this.bootstrapService.initializeSystem(req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = BootstrapController;
