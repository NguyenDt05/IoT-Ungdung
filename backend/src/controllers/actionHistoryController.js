const { pool } = require('../config/database');
const { parsePagination, buildPagination } = require('../utils/pagination');

async function getActionHistory(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const keyword = String(req.query.keyword || '').trim();
    const params = [];
    let whereClause = '';

    if (keyword) {
      whereClause = `WHERE (
        d.device_name LIKE ? OR
        ah.action LIKE ? OR
        ah.status LIKE ? OR
        u.full_name LIKE ? OR
        CAST(ah.action_id AS CHAR) LIKE ?
      )`;
      const pattern = `%${keyword}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    const joins = `
      INNER JOIN devices d ON d.device_id = ah.device_id
      LEFT JOIN users u ON u.user_id = ah.user_id`;

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM action_history ah
       ${joins}
       ${whereClause}`,
      params,
    );

    const [rows] = await pool.execute(
      `SELECT
         ah.action_id AS id,
         ah.user_id AS userId,
         u.full_name AS userName,
         ah.device_id AS deviceId,
         d.device_name AS deviceName,
         ah.action,
         ah.status,
         ah.created_at AS createdAt
       FROM action_history ah
       ${joins}
       ${whereClause}
       ORDER BY ah.created_at DESC, ah.action_id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const totalItems = Number(countRows[0].total);

    res.status(200).json({
      data: rows,
      pagination: buildPagination(page, limit, totalItems),
      filters: { keyword },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getActionHistory };
