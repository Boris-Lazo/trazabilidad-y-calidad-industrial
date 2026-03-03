const ValidationError = require('./ValidationError');
const NotFoundError = require('./NotFoundError');
const UnauthorizedError = require('./UnauthorizedError');
const ForbiddenError = require('./ForbiddenError');
const DatabaseError = require('./DatabaseError');
const AppError = require('./AppError');
const DomainError = require('./DomainError');

module.exports = {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  DatabaseError,
  DomainError,
  AppError
};
