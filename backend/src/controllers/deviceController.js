const { pool } = require('../config/database');
const AppError = require('../utils/AppError');
const {
  publishDeviceCommand,
  scheduleActionTimeout,
  clearActionTimeout,
  markActionFailed,
} = require('../services/mqttService');

async function controlDevice(req, res, next) {
  let actionId;
  let connection;

  try {
    const deviceId = Number(req.body?.deviceId);
    const command = String(req.body?.command || '').toUpperCase();
    const userId = Number(process.env.DEFAULT_USER_ID || 1);

    if (!Number.isInteger(deviceId) || deviceId < 1) {
      throw new AppError('deviceId must be a positive integer', 400);
    }

    if (!['ON', 'OFF'].includes(command)) {
      throw new AppError('command must be ON or OFF', 400);
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Locking the row makes the existence check and history creation one
    // consistent operation if another request controls this device concurrently.
    const [devices] = await connection.execute(
      `SELECT device_id, device_name, status
       FROM devices
       WHERE device_id = ?
       FOR UPDATE`,
      [deviceId],
    );

    if (devices.length === 0) {
      throw new AppError('Device was not found', 404);
    }

    const [result] = await connection.execute(
      `INSERT INTO action_history (user_id, device_id, action, status, created_at)
       VALUES (?, ?, ?, 'PENDING', NOW())`,
      [userId, deviceId, command],
    );

    actionId = result.insertId;
    await connection.commit();
    connection.release();
    connection = undefined;

    // Timeout starts immediately after the durable PENDING record is created.
    scheduleActionTimeout(actionId);

    try {
      await publishDeviceCommand({ actionId, deviceId, command });
    } catch (publishError) {
      clearActionTimeout(actionId);
      await markActionFailed(actionId);
      throw new AppError(`Could not publish command: ${publishError.message}`, 503);
    }

    res.status(202).json({
      message: 'Command accepted and is waiting for a device acknowledgement',
      action: {
        actionId,
        deviceId,
        command,
        status: 'PENDING',
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[DB] Could not roll back device control:', rollbackError);
      } finally {
        connection.release();
      }
    }

    next(error);
  }
}

module.exports = { controlDevice };
