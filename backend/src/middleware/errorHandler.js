const AppError = require('../utils/AppError');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  // Express/body-parser errors expose `status`; application errors use
  // `statusCode`. Preserve both (for example malformed JSON must return 400).
  const statusCode = error.statusCode || error.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error('[HTTP]', error);
  }

  res.status(statusCode).json({
    message: statusCode === 500 && isProduction
      ? 'Internal server error'
      : error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(!isProduction && statusCode >= 500 ? { stack: error.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
