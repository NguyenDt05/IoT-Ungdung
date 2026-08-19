const { pool } = require('../config/database');

async function getDashboard(req, res, next) {
  try {
    const disconnectSeconds = Number(process.env.SENSOR_DISCONNECT_SECONDS || 30);

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

    const sensorDetails = sensorRows.map((row) => ({
      ...row,
      value: row.value === null ? null : Number(row.value),
    }));

    // This compact object matches the stat cards in the existing frontend.
    const sensors = Object.fromEntries(
      sensorDetails.map((sensor) => [sensor.sensorType, sensor.value]),
    );
    const { connectionStatus, lastUpdated } = freshnessRows[0];

    res.status(200).json({
      connectionStatus,
      // Kept as an alias because the current frontend calls this field `status`.
      status: connectionStatus,
      lastUpdated,
      sensors,
      sensorDetails,
      devices: deviceRows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };
