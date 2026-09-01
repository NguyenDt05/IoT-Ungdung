const { pool } = require('../config/database');
const AppError = require('../utils/AppError');

const CHART_BLOCK_MS = 5 * 60 * 1000;

function getCurrentChartBlock() {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(Math.floor(start.getMinutes() / 5) * 5);

  return { start, end: new Date(start.getTime() + CHART_BLOCK_MS) };
}

function parseChartQuery(query) {
  const defaultBlock = getCurrentChartBlock();
  const start = query.chartStart ? new Date(query.chartStart) : defaultBlock.start;
  const end = query.chartEnd ? new Date(query.chartEnd) : defaultBlock.end;
  const afterId = Number(query.chartAfterId || 0);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new AppError('chartStart and chartEnd must define a valid time range', 400);
  }

  if (end.getTime() - start.getTime() !== CHART_BLOCK_MS) {
    throw new AppError('chart time range must be exactly 5 minutes', 400);
  }

  if (!Number.isInteger(afterId) || afterId < 0) {
    throw new AppError('chartAfterId must be a non-negative integer', 400);
  }

  return { start, end, afterId };
}

async function getDashboard(req, res, next) {
  try {
    const disconnectSeconds = Number(process.env.SENSOR_DISCONNECT_SECONDS || 30);
    const chartQuery = parseChartQuery(req.query);

    // The correlated subquery returns exactly one newest row for each sensor,
    // including deterministic ordering when two rows have the same timestamp.
    const [sensorRows] = await pool.query(
      `SELECT
         s.sensor_id AS sensorId,
         s.sensor_name AS sensorName,
         s.sensor_type AS sensorType,
         s.unit,
         latest.value,
         latest.created_at AS createdAt
       FROM sensors s
       LEFT JOIN data_sensor latest
         ON latest.data_id = (
           SELECT ds.data_id
           FROM data_sensor ds
           WHERE ds.sensor_id = s.sensor_id
           ORDER BY ds.created_at DESC, ds.data_id DESC
           LIMIT 1
         )
       ORDER BY s.sensor_id ASC`,
    );

    const [deviceRows] = await pool.query(
      `SELECT
         device_id AS id,
         device_name AS name,
         status,
         updated_at AS updatedAt
       FROM devices
       ORDER BY device_id ASC`,
    );

    // Use the database clock for the offline check, avoiding clock/timezone
    // drift between Node.js and MySQL.
    const [freshnessRows] = await pool.execute(
      `SELECT
         MAX(created_at) AS lastUpdated,
         CASE
           WHEN MAX(created_at) IS NOT NULL
             AND TIMESTAMPDIFF(SECOND, MAX(created_at), NOW()) <= ?
           THEN 'CONNECTED'
           ELSE 'DISCONNECTED'
         END AS connectionStatus
       FROM data_sensor`,
      [disconnectSeconds],
    );

    const [chartRows] = await pool.execute(
      `SELECT
         MAX(ds.data_id) AS pointId,
         MAX(ds.created_at) AS createdAt,
         MAX(CASE WHEN s.sensor_type = 'TEMPERATURE' THEN ds.value END) AS temperature,
         MAX(CASE WHEN s.sensor_type = 'HUMIDITY' THEN ds.value END) AS humidity,
         MAX(CASE WHEN s.sensor_type = 'LIGHT' THEN ds.value END) AS light
       FROM data_sensor ds
       INNER JOIN sensors s ON s.sensor_id = ds.sensor_id
       WHERE ds.created_at >= ?
         AND ds.created_at < ?
         AND ds.data_id > ?
       GROUP BY ds.created_at
       ORDER BY createdAt ASC`,
      [chartQuery.start, chartQuery.end, chartQuery.afterId],
    );

    const sensorDetails = sensorRows.map((row) => ({
      ...row,
      value: row.value === null ? null : Number(row.value),
    }));

    // This compact object matches the stat cards in the existing frontend.
    const sensors = Object.fromEntries(
      sensorDetails.map((sensor) => [String(sensor.sensorType).toLowerCase(), sensor.value]),
    );
    const { connectionStatus, lastUpdated } = freshnessRows[0];
    const chartData = chartRows.map((row) => ({
      pointId: Number(row.pointId),
      createdAt: row.createdAt,
      temperature: row.temperature === null ? null : Number(row.temperature),
      humidity: row.humidity === null ? null : Number(row.humidity),
      light: row.light === null ? null : Number(row.light),
    }));

    res.status(200).json({
      connectionStatus,
      // Kept as an alias because the current frontend calls this field `status`.
      status: connectionStatus,
      lastUpdated,
      sensors,
      sensorDetails,
      chartData,
      devices: deviceRows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };
