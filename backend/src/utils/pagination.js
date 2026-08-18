const AppError = require('./AppError');

function parsePagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError('page must be a positive integer', 400);
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError('limit must be an integer from 1 to 100', 400);
  }

  return { page, limit, offset: (page - 1) * limit };
}

function buildPagination(page, limit, totalItems) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  };
}

module.exports = { parsePagination, buildPagination };
