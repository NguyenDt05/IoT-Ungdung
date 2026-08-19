const { pool } = require('../config/database');
const AppError = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/pagination');

const SENSOR_TYPES = new Set(['temperature', 'humidity', 'light']);

async function getSensorHistory(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const keyword = String(req.query.keyword || '').trim();
    const type = String(req.query.type || '').trim().toLowerCase();

    if (type && !SENSOR_TYPES.has(type)) {
      throw new AppError('type must be temperature, humidity, or light', 400);
    }

    const conditions = [];
    const params = [];

    if (keyword) {
      conditions.push(`(
        s.sensor_name LIKE ? OR
        s.sensor_type LIKE ? OR
        CAST(ds.data_id AS CHAR) LIKE ? OR
        CAST(ds.value AS CHAR) LIKE ?
      )`);
      const pattern = `%${keyword}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (type) {
      conditions.push('s.sensor_type = ?');
      params.push(type);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM data_sensor ds
       INNER JOIN sensors s ON s.sensor_id = ds.sensor_id
       ${whereClause}`,
      params,
    );

    const [rows] = await pool.execute(
      `SELECT
         ds.data_id AS id,
         s.sensor_id AS sensorId,
         s.sensor_name AS name,
         s.sensor_type AS type,
         ds.value,
         s.unit,
         ds.created_at AS createdAt
       FROM data_sensor ds
       INNER JOIN sensors s ON s.sensor_id = ds.sensor_id
       ${whereClause}
       ORDER BY ds.created_at DESC, ds.data_id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const totalItems = Number(countRows[0].total);

    res.status(200).json({
      data: rows.map((row) => ({ ...row, value: Number(row.value) })),
      pagination: buildPagination(page, limit, totalItems),
      filters: { keyword, type: type || null },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getSensorHistory };
